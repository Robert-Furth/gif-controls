use std::fmt::Debug;
use std::fs::{self, File};
use std::io::{BufReader, Read};
use std::iter::zip;
use std::path::{Path, PathBuf};
use std::time::Instant;

use byteorder::{ByteOrder, LE};
use serde::{Deserialize, Serialize};

use gif_controls_decoder::{decode, DecodeError, DecodedGif};
use xz2::read::XzDecoder;

pub fn resource_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("test-resources")
}

pub fn test_input<P: Into<PathBuf>>(path: P) -> PathBuf {
    resource_dir().join("input").join(path.into())
}

pub fn test_output<P: Into<PathBuf>>(path: P) -> PathBuf {
    resource_dir().join("expected").join(path.into())
}

pub struct Image {
    pub width: u16,
    pub height: u16,
    pub pixel_data: Vec<u8>,
}

pub fn read_gif_file<P: AsRef<Path> + Debug>(path: P) -> Result<DecodedGif, DecodeError> {
    let data = fs::read(&path).unwrap().into_boxed_slice();

    let start = Instant::now();
    let result = decode(data);
    let elapsed = start.elapsed();
    println!(
        "> {} decoded in {:.2?}s",
        path.as_ref().file_name().unwrap().to_string_lossy(),
        elapsed.as_secs_f64(),
    );
    result
}

/// Extremely simple format: width and height as `u16` (LE), followed by the raw
/// pixel data for each frame in order. (RGBA, left to right and top to bottom.)
pub fn read_bin_file<P: AsRef<Path>>(path: P) -> Vec<Image> {
    let buf = if path.as_ref().extension().is_some_and(|s| s == "xz") {
        let f = File::open(&path).unwrap();
        let mut dec = XzDecoder::new(f);
        let mut buf = vec![];
        dec.read_to_end(&mut buf).unwrap();
        buf
    } else {
        fs::read(&path).unwrap()
    };
    let width = LE::read_u16(&buf[0..2]);
    let height = LE::read_u16(&buf[2..4]);

    let stride = usize::from(width) * usize::from(height) * 4;
    buf[4..]
        .chunks(stride)
        .map(|slice| Image {
            width,
            height,
            pixel_data: slice.to_vec(),
        })
        .collect()
}

pub fn compare_frames(gif: &DecodedGif, expected: &Vec<Image>) {
    assert_eq!(gif.frames.len(), expected.len());
    assert_eq!(gif.canvas_width, expected[0].width);
    assert_eq!(gif.canvas_height, expected[0].height);

    for (frame_num, (actual, expected)) in zip(&gif.frames, expected).enumerate() {
        let v1 = &actual.image_data.to_vec();
        let v2 = &expected.pixel_data;

        assert_eq!(
            v1.len(),
            v2.len(),
            "Error on frame {}: Lengths not equal",
            frame_num
        );

        for (index, (el1, el2)) in v1.chunks(4).zip(v2.chunks(4)).enumerate() {
            let pixel_idx = (
                index % usize::from(gif.canvas_width),
                index / usize::from(gif.canvas_width),
            );

            if el1[3] != 0 || el2[3] != 0 {
                assert_eq!(
                    el1, el2,
                    "Pixels differ on frame {}, (x, y) = {:?}",
                    frame_num, pixel_idx
                )
            }
        }
    }
}

#[derive(Serialize, Deserialize)]
struct GifMeta {
    width: u16,
    height: u16,
    loops: Option<u16>,
    frames: Vec<GifFrameMeta>,
}

#[derive(Serialize, Deserialize)]
struct GifFrameMeta {
    width: u16,
    height: u16,
    top: u16,
    left: u16,
    delay: u16,
}

pub fn compare_meta(gif: &DecodedGif, meta_path: impl AsRef<Path>) {
    let reader = BufReader::new(File::open(&meta_path).unwrap());
    let meta: GifMeta = serde_json::from_reader(reader).expect("Meta did not conform to spec");

    assert_eq!(gif.canvas_width, meta.width);
    assert_eq!(gif.canvas_height, meta.height);
    assert_eq!(gif.max_loops, meta.loops);
    assert_eq!(gif.frames.len(), meta.frames.len());

    for (index, (gframe, mframe)) in gif.frames.iter().zip(meta.frames.iter()).enumerate() {
        assert_eq!(gframe.left, mframe.left, "frame {} left", index);
        assert_eq!(gframe.top, mframe.top, "frame {} top", index);
        assert_eq!(gframe.width, mframe.width, "frame {} width", index);
        assert_eq!(gframe.height, mframe.height, "frame {} height", index);
        assert_eq!(gframe.delay, mframe.delay, "frame {} delay", index);
    }
}
