# GIF Controls

A browser extension to add playback controls to GIFs.

## Building from Source

Requirements:

- Rust (`rustc` v1.83.0 or higher)
- [`wasm-pack`](https://rustwasm.github.io/wasm-pack/) v0.13.1 or higher
- NodeJS v18 or higher
- `make`

Run:

```bash
make firefox  # To generate the Firefox version of the extension
make chrome   # To generate the Chrome version of the extension
```

Or, to generate both versions:

```bash
make all  # Or just `make`
```

The built extension will be in `.output/<browser>-<manifestVersion>/`. For
Firefox, that's `.output/firefox-mv2/`; for Chrome, it's `.output/chrome-mv3/`.
