use std::io::{self, prelude::*};

use byteorder::{ByteOrder, ReadBytesExt, LE};
use thiserror::Error;
use wasm_bindgen::prelude::*;

use crate::util::{LZWError, LZWIterator};

mod util;

#[wasm_bindgen(js_name = decode)]
pub fn decode_js(data: Box<[u8]>) -> Result<DecodedGif, JsError> {
    Ok(decode(data)?)
}

pub fn decode(data: Box<[u8]>) -> Result<DecodedGif, DecodeError> {
    let cursor = io::Cursor::new(data);
    let mut decoder = Decoder::new(cursor)?;
    decoder.read_body()?;
    Ok(decoder.into_gif())
}

#[wasm_bindgen]
pub struct DecodedGif {
    #[wasm_bindgen(readonly, js_name = canvasWidth)]
    pub canvas_width: u16,
    #[wasm_bindgen(readonly, js_name = canvasHeight)]
    pub canvas_height: u16,
    #[wasm_bindgen(readonly, js_name = maxLoops)]
    pub max_loops: Option<u16>,

    #[wasm_bindgen(readonly, js_name = numFrames)]
    pub num_frames: usize,
    #[wasm_bindgen(skip)]
    pub frames: Vec<GifFrame>,
}

#[wasm_bindgen]
impl DecodedGif {
    pub fn frame(&self, i: usize) -> Result<GifFrame, JsError> {
        if i >= self.frames.len() {
            return Err(JsError::new("Index out of bounds"));
        }

        Ok(self.frames[i].clone())
    }
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct GifFrame {
    #[wasm_bindgen(readonly)]
    pub width: u16,
    #[wasm_bindgen(readonly)]
    pub height: u16,
    #[wasm_bindgen(readonly)]
    pub top: u16,
    #[wasm_bindgen(readonly)]
    pub left: u16,
    #[wasm_bindgen(readonly)]
    pub delay: u16, // Note most browsers round up low frame times

    #[wasm_bindgen(readonly, getter_with_clone, js_name = imageData)]
    pub image_data: Box<[u8]>, // RGBA order
                               // pub image_data: ImageData,
}

impl GifFrame {
    fn new(fdec: &FrameDecoder, cvs: Canvas) -> Self {
        Self {
            width: fdec.width,
            height: fdec.height,
            top: fdec.top,
            left: fdec.left,
            delay: fdec.delay,
            image_data: cvs
                .data
                .into_iter()
                .flat_map(|color| color.into_arr())
                .collect(),
        }
    }
}

#[derive(Error, Debug)]
pub enum DecodeError {
    #[error("IO error: {0}")]
    IO(#[from] io::Error),

    #[error("Not a GIF file")]
    NotAGif,
    #[error("Invalid GIF version \"{0}\"")]
    InvalidVersion(String),
    #[error("Unknown block type 0x{0:x}")]
    UnknownBlock(u8),

    #[error("Color table indexed out of bounds")]
    ColorTableOutOfBounds,

    #[error("Frame data underflow")]
    FrameUnderflow,
    #[error("Frame data overflow")]
    FrameOverflow,

    #[error("LZW decompression error: {0}")]
    LZWError(#[from] LZWError),
}

#[derive(Default)]
struct Decoder<R: Read> {
    rdr: R,

    // From logical screen descriptor
    canvas_width: u16,
    canvas_height: u16,
    global_palette: Option<ColorTable>,
    #[allow(dead_code)]
    bg_color: Color,

    // From NETSCAPE2.0 appl. extension
    max_loops: Option<u16>,

    // Frame-specific state, cleared after each frame
    frame_dec: FrameDecoder,

    working_canvas: Canvas,
    frames: Vec<GifFrame>,
}

impl<R: Read> Decoder<R> {
    fn new(mut rdr: R) -> Result<Self, DecodeError> {
        let mut magic = [0; 3];
        rdr.read_exact(&mut magic)?;
        if magic != *b"GIF" {
            return Err(DecodeError::NotAGif);
        }

        let mut version = [0; 3];
        rdr.read_exact(&mut version)?;
        if version != *b"87a" && version != *b"89a" {
            return Err(DecodeError::InvalidVersion(
                String::from_utf8_lossy(&version).to_string(),
            ));
        }

        // logical screen descriptor
        let canvas_width = rdr.read_u16::<LE>()?;
        let canvas_height = rdr.read_u16::<LE>()?;

        let packed = rdr.read_u8()?;
        let has_global_palette = packed & 0x80 != 0;
        let global_palette_size = 1usize << ((packed & 0x7) + 1);
        let background_color_index = usize::from(rdr.read_u8()?);

        rdr.read_u8()?; // pixel aspect ratio -- unused

        // Read global color table if present
        let (bg_color, global_palette) = if has_global_palette {
            let ct = ColorTable::read(&mut rdr, global_palette_size)?;
            let bg_color = ct.get(background_color_index).unwrap_or_default();
            let global_palette = Some(ct);

            (bg_color, global_palette)
        } else {
            (Color::default(), None)
        };

        let working_canvas = Canvas::from_bg_color(
            Color::transparent(),
            canvas_width.into(),
            canvas_height.into(),
        );

        Ok(Self {
            rdr,
            canvas_width,
            canvas_height,
            global_palette,
            bg_color,
            max_loops: None,
            frame_dec: FrameDecoder::default(),
            working_canvas,
            frames: vec![],
        })
    }

    fn read_body(&mut self) -> Result<(), DecodeError> {
        loop {
            let sigil = match self.rdr.read_u8() {
                Ok(b) => b,
                // Allow files without a trailer
                Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => return Ok(()),
                Err(e) => return Err(e.into()),
            };

            match sigil {
                0x21 => self.read_extension()?,
                0x2c => self.read_frame()?,
                0x3b => return Ok(()),
                b => return Err(DecodeError::UnknownBlock(b)),
            };
        }
    }

    fn read_extension(&mut self) -> Result<(), DecodeError> {
        match self.rdr.read_u8()? {
            0xf9 => self.frame_dec.read_gfx_ctrl_ext(&mut self.rdr),
            0xff => self.read_application_ext(),
            _ => {
                read_blocks(&mut self.rdr)?;
                Ok(())
            }
        }
    }

    fn read_application_ext(&mut self) -> Result<(), DecodeError> {
        let blocks = read_blocks(&mut self.rdr)?;
        if blocks.len() < 2 {
            return Ok(());
        }

        if &blocks[0] != b"NETSCAPE2.0" {
            return Ok(());
        }

        if blocks[1].len() < 3 {
            return Ok(());
        }

        self.max_loops = Some(LE::read_u16(&blocks[1][1..3]));
        Ok(())
    }

    fn read_frame(&mut self) -> Result<(), DecodeError> {
        // Read image descriptor
        self.frame_dec.read_image_descriptor(&mut self.rdr)?;

        // Choose color table to use
        let palette = if let Some(pal) = &self.frame_dec.palette {
            pal
        } else if let Some(pal) = &self.global_palette {
            pal
        } else {
            // All-black color table, just to display something
            &ColorTable::null()
        };

        // Read the image data, deinterlacing if necessary
        let canvas = {
            let c = Canvas::from_gif_data(
                &mut self.rdr,
                palette,
                self.frame_dec.transparency_idx,
                self.frame_dec.width.into(),
                self.frame_dec.height.into(),
            )?;
            if self.frame_dec.interlaced {
                c.deinterlaced()
            } else {
                c
            }
        };

        // Blit image onto canvas
        let new_canvas = self.working_canvas.blit(
            &canvas,
            self.frame_dec.top.into(),
            self.frame_dec.left.into(),
        );

        // Handle frame disposal method
        match self.frame_dec.disposal_method {
            DisposalMethod::Keep => self.working_canvas = new_canvas.clone(),

            // Although the GIF specification says that this disposal method
            // should clear the frame's area with the background color, every
            // modern viewer/library I could find (except for PIL) clears it
            // with transparency instead. Apparently it's de facto standard now.
            // https://usage.imagemagick.org/anim_basics/#background
            DisposalMethod::RestoreBackground => {
                self.working_canvas.clear_rect_mut(
                    self.frame_dec.top.into(),
                    self.frame_dec.left.into(),
                    self.frame_dec.width.into(),
                    self.frame_dec.height.into(),
                );
            }

            DisposalMethod::RestorePrevious => {}
        }

        // Construct GifFrame and add it to the frame list
        let frame = GifFrame::new(&self.frame_dec, new_canvas);
        self.frames.push(frame);

        // Clear frame state
        self.frame_dec = FrameDecoder::default();

        Ok(())
    }

    fn into_gif(self) -> DecodedGif {
        DecodedGif {
            canvas_width: self.canvas_width,
            canvas_height: self.canvas_height,
            max_loops: self.max_loops,
            num_frames: self.frames.len(),
            frames: self.frames,
        }
    }
}

#[derive(Default)]
struct FrameDecoder {
    transparency_idx: Option<usize>,
    palette: Option<ColorTable>,
    interlaced: bool,

    left: u16,
    top: u16,
    width: u16,
    height: u16,
    delay: u16,
    disposal_method: DisposalMethod,

    frame: Canvas,
}

impl FrameDecoder {
    fn read_gfx_ctrl_ext<R: Read>(&mut self, mut rdr: R) -> Result<(), DecodeError> {
        let block = read_blocks(&mut rdr)?.concat();
        if block.len() < 4 {
            // Invalid block, skip it
            return Ok(());
        }

        let packed = block[0];
        let disposal = (packed & 0b00011100) >> 2;
        let has_transparency = packed & 1 == 1;

        self.disposal_method = DisposalMethod::from_u8(disposal);
        self.delay = LE::read_u16(&block[1..3]);
        if has_transparency {
            self.transparency_idx = Some(block[3].into());
        }

        Ok(())
    }

    fn read_image_descriptor<R: Read>(&mut self, mut rdr: R) -> Result<(), DecodeError> {
        self.left = rdr.read_u16::<LE>()?;
        self.top = rdr.read_u16::<LE>()?;
        self.width = rdr.read_u16::<LE>()?;
        self.height = rdr.read_u16::<LE>()?;
        let packed = rdr.read_u8()?;

        let has_palette = packed & 0x80 != 0;
        let palette_size = 1usize << ((packed & 0x7) + 1);
        self.interlaced = packed & 0x70 != 0;

        if has_palette {
            self.palette = Some(ColorTable::read(&mut rdr, palette_size)?);
        }

        self.frame =
            Canvas::from_bg_color(Color::transparent(), self.width.into(), self.height.into());

        Ok(())
    }
}

fn read_blocks<R: Read>(mut rdr: R) -> Result<Vec<Vec<u8>>, DecodeError> {
    let mut blocks = vec![];

    loop {
        let block_size = rdr.read_u8()?;
        if block_size == 0 {
            break;
        }
        let mut block = vec![0; block_size.into()];
        rdr.read_exact(&mut block)?;
        blocks.push(block);
    }

    Ok(blocks)
}

#[derive(Default, Clone, Copy)]
pub enum DisposalMethod {
    #[default]
    Keep,
    RestoreBackground,
    RestorePrevious,
}

impl DisposalMethod {
    fn from_u8(b: u8) -> Self {
        match b {
            2 => Self::RestoreBackground,
            3 => Self::RestorePrevious,
            _ => Self::Keep,
        }
    }
}

#[derive(Default, Clone)]
struct Canvas {
    width: usize,
    height: usize,
    data: Vec<Color>,
}

impl Canvas {
    fn from_bg_color(color: Color, width: usize, height: usize) -> Self {
        Self {
            width,
            height,
            data: vec![color; width * height],
        }
    }

    fn from_gif_data<R: Read>(
        mut rdr: R,
        palette: &ColorTable,
        transparency_index: Option<usize>,
        width: usize,
        height: usize,
    ) -> Result<Self, DecodeError> {
        let min_code_size = rdr.read_u8()?;
        let blocks_iter = read_blocks(rdr)?.into_iter().flatten();

        let mut data = vec![];

        for sequence_result in LZWIterator::new(blocks_iter, min_code_size)? {
            let sequence = sequence_result?;
            for index in sequence {
                let index: usize = index.into();
                let color = match transparency_index {
                    Some(i) if i == index => Color::transparent(),
                    _ => palette.get(index)?,
                };
                data.push(color);
            }
        }

        let expected_size: usize = usize::from(width) * usize::from(height);
        if data.len() < expected_size {
            return Err(DecodeError::FrameUnderflow);
        } else if data.len() > expected_size {
            return Err(DecodeError::FrameOverflow);
        }

        Ok(Self {
            width,
            height,
            data,
        })
    }

    fn blit(&self, src: &Canvas, top: usize, left: usize) -> Canvas {
        let mut dst = self.clone();
        dst.blit_mut(src, top, left);
        dst
    }

    fn blit_mut(&mut self, src: &Canvas, top: usize, left: usize) {
        for (src_start_idx, src_end_idx, dest_start_idx, dest_end_idx) in
            self.blit_iter(top, left, src.width, src.height)
        {
            for (i, j) in (src_start_idx..src_end_idx).zip(dest_start_idx..dest_end_idx) {
                if !src.data[i].is_transparent() {
                    self.data[j] = src.data[i];
                }
            }
        }
    }

    fn clear_rect_mut(&mut self, top: usize, left: usize, width: usize, height: usize) {
        for (_, _, dest_start_idx, dest_end_idx) in self.blit_iter(top, left, width, height) {
            self.data[dest_start_idx..dest_end_idx].fill(Color::transparent());
        }
    }

    fn blit_iter(
        &self,
        top: usize,
        left: usize,
        width: usize,
        height: usize,
    ) -> impl Iterator<Item = (usize, usize, usize, usize)> {
        let start_dest_col = left;
        let end_dest_col = self.width.min(left.saturating_add(width));
        let start_dest_row = top;
        let end_dest_row = self.height.min(top.saturating_add(height));

        let src_width = width;
        let dest_width = self.width;
        let copy_width = end_dest_col - start_dest_col;

        (start_dest_row..end_dest_row)
            .enumerate()
            .map(move |(src_row, dest_row)| {
                let src_start_idx = src_row * src_width;
                let src_end_idx = src_start_idx + copy_width;
                let dest_start_idx = dest_row * dest_width + start_dest_col;
                let dest_end_idx = dest_start_idx + copy_width;

                (src_start_idx, src_end_idx, dest_start_idx, dest_end_idx)
            })
    }

    fn deinterlaced(&self) -> Self {
        let mut dest = vec![Color::default(); self.width * self.height];

        let height8 = self.height.div_ceil(8);
        let height4 = self.height.div_ceil(4);
        let height2 = self.height.div_ceil(2);

        for (dest_row_num, dest_row) in dest.chunks_exact_mut(self.width).enumerate() {
            let source_row_num = if dest_row_num % 8 == 0 {
                dest_row_num / 8
            } else if dest_row_num % 4 == 0 {
                height8 + (dest_row_num - 4) / 8
            } else if dest_row_num % 2 == 0 {
                height4 + (dest_row_num - 2) / 4
            } else {
                height2 + (dest_row_num / 2)
            };

            let i = source_row_num * self.width;
            dest_row.copy_from_slice(&self.data[i..i + self.width]);
        }

        Self {
            width: self.width,
            height: self.height,
            data: dest,
        }
    }
}

#[derive(Clone, Copy)]
struct Color(u8, u8, u8, bool);

impl Color {
    fn rgb(r: u8, g: u8, b: u8) -> Self {
        Self(r, g, b, true)
    }

    fn transparent() -> Self {
        Self(0, 0, 0, false)
    }

    fn is_transparent(&self) -> bool {
        return !self.3;
    }

    fn into_arr(self) -> [u8; 4] {
        if self.3 {
            [self.0, self.1, self.2, 255]
        } else {
            [0; 4]
        }
    }
}

impl Default for Color {
    fn default() -> Self {
        Self(0, 0, 0, true)
    }
}

struct ColorTable {
    table: Vec<Color>,
}

impl ColorTable {
    fn null() -> Self {
        Self {
            table: vec![Color::default(); 256],
        }
    }

    fn read<R: Read>(mut rdr: R, size: usize) -> Result<Self, DecodeError> {
        let mut table = Vec::with_capacity(size);
        for _ in 0..size {
            let mut buf = [0; 3];
            rdr.read_exact(&mut buf)?;
            table.push(Color::rgb(buf[0], buf[1], buf[2]));
        }

        Ok(Self { table })
    }

    fn get(&self, index: usize) -> Result<Color, DecodeError> {
        self.table
            .get(index)
            .copied()
            .ok_or(DecodeError::ColorTableOutOfBounds)
    }
}
