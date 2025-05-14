mod util;

mod valid_gifs {
    use crate::util::*;

    #[test]
    pub fn normal_gif() {
        let decoded = read_gif_file(test_input("earth.gif")).unwrap();
        let expected = read_bin_file(test_output("earth.bin.xz"));
        compare_frames(&decoded, &expected);
    }

    #[test]
    pub fn transparent_bkgd() {
        let decoded = read_gif_file(test_input("earth-transparent.gif")).unwrap();
        let expected = read_bin_file(test_output("earth-transparent.bin.xz"));
        compare_frames(&decoded, &expected);
    }

    #[test]
    pub fn local_color_table() {
        let decoded = read_gif_file(test_input("local-color-table.gif")).unwrap();
        let expected = read_bin_file(test_output("local-color-table.bin.xz"));
        compare_frames(&decoded, &expected);
    }

    #[test]
    pub fn interlaced() {
        let decoded = read_gif_file(test_input("interlaced.gif")).unwrap();
        compare_meta(&decoded, test_output("interlaced.json"));

        let expected = read_bin_file(test_output("interlaced.bin.xz"));
        compare_frames(&decoded, &expected);
    }

    #[test]
    pub fn interlaced2() {
        let decoded = read_gif_file(test_input("interlaced2.gif")).unwrap();
        let expected = read_bin_file(test_output("interlaced2.bin.xz"));
        compare_frames(&decoded, &expected);
    }

    #[test]
    pub fn one_bpp() {
        let decoded = read_gif_file(test_input("1bpp.gif")).unwrap();
        compare_meta(&decoded, test_output("1bpp.json"));

        let expected = read_bin_file(test_output("1bpp.bin.xz"));
        compare_frames(&decoded, &expected);
    }

    /// Disposal method 1: keep
    #[test]
    pub fn disposal_method_1() {
        let decoded = read_gif_file(test_input("dispose1.gif")).unwrap();
        let expected = read_bin_file(test_output("dispose1.bin.xz"));
        compare_frames(&decoded, &expected);
    }

    /// Disposal method 2: restore to "background" (i.e. transparency)
    #[test]
    pub fn disposal_method_2() {
        let decoded = read_gif_file(test_input("dispose2.gif")).unwrap();
        let expected = read_bin_file(test_output("dispose2.bin.xz"));
        compare_frames(&decoded, &expected);
    }

    /// Disposal method 3: restore to previous
    #[test]
    pub fn disposal_method_3() {
        let decoded = read_gif_file(test_input("dispose3.gif")).unwrap();
        let expected = read_bin_file(test_output("dispose3.bin.xz"));
        compare_frames(&decoded, &expected);
    }
}

mod invalid_gifs {
    use std::io;

    use gif_controls_decoder::DecodeError;

    use crate::util::*;

    /// Ensure the decoder doesn't crash if a frame has neither a global nor local color table
    #[test]
    pub fn no_crash_on_missing_color_table() {
        if let Err(e) = read_gif_file(test_input("earth-bad-color-table.gif")) {
            panic!("Unexpected error: {}", e);
        }
    }

    /// Current behavior for truncated frames is to throw an error. This might change in the future.
    #[test]
    pub fn truncated_frame() {
        // if let Err(DecodeError::IO(io::ErrorKind::UnexpectedEof));
        match read_gif_file(test_input("truncated-frame.gif")) {
            Err(DecodeError::IO(ioe)) => match ioe.kind() {
                io::ErrorKind::UnexpectedEof => {}
                _ => panic!("Unexpected IO error: {:?}", ioe),
            },
            Err(e) => panic!("Unexpected error kind: {:?}", e),
            Ok(_) => panic!("Unexpected success"),
        }
    }
}
