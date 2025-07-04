# GIF Controls

A browser extension to add playback controls to GIFs.

**Install:** [Firefox](https://addons.mozilla.org/en-US/firefox/addon/gif-controls/) &bull; Chrome (coming soon!)

- [Features](#features)
- [Building from Source](#building-from-source)
  - [with Docker](#with-docker)
  - [without Docker](#without-docker)

## Features

Right-click any GIF on a page and select "Add Controls":

![Right-clicking on a GIF brings up a context menu to add controls to it](docs/images/add-controls.gif)

Scrub, pause, and go frame-by-frame with the controls at the bottom:

![Use the controls at left to pause, unpause, and go frame-by-frame](docs/images/playpause.gif) ![Click-drag on the scrub bar to scrub through the GIF](docs/images/scrubbing.gif)

Adjust the playback speed, play the GIF in reverse, and more:

![The options menu lets you adjust player settings like the playback speed](docs/images/options.gif)

Resize and move the GIF:

![Click-drag on the handles to move or resize the GIF](docs/images/move-resize.gif)

## Building from Source

Use Docker if you want to ensure that the generated extension is exactly the same as the one
submitted to Firefox Addons or the Chrome Web Store.

With either method, the built extension will be placed in `.output/<browser>-<manifestVersion>/`.
For Firefox, that's `.output/firefox-mv2/`; for Chrome, it's `.output/chrome-mv3/`.

### With Docker

First, build the Docker image:

```bash
docker build -t gif-controls-build ./build
```

Once that's done, build the extension:

```bash
# All tail args will be passed to `make`, so you can provide any target specified in the Makefile
# after `gif-controls-build`. For instance, provide `firefox` to build just the Firefox version, or
# `zip` for the zipped extension & its sources.
docker run --rm -v "${PWD}:/source" gif-controls-build
```

### Without Docker

Requirements:

- Rust (`rustc` v1.83.0 or higher)
- [`wasm-pack`](https://rustwasm.github.io/wasm-pack/) v0.13.1 or higher
- NodeJS v18 or higher
- `make`

Once you've installed all those, run:

```bash
make all  # Or just `make`
```

Or, to build the extension for a specific browser:

```bash
make firefox  # To generate the Firefox version of the extension
make chrome   # To generate the Chrome version of the extension
```

Or, to zip the built extensions and sources:

```bash
make zip  # zip-firefox for FF only, zip-chrome for Chrome only
```
