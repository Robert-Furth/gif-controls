import init, { decode as wasmDecode } from "@@/decoder/pkg/gif_controls_decoder";

export type Frame = {
  imageData: Uint8Array;
  delay: number;
};

export type Gif = {
  canvasWidth: number;
  canvasHeight: number;
  maxLoops?: number;
  numFrames: number;
  bgColor: string;
  frames: Frame[];
};

export async function decode(arr: Uint8Array, wasm_path: string): Promise<Gif> {
  await init({ module_or_path: wasm_path });

  const g = wasmDecode(arr);

  const frames: Frame[] = [];
  for (let i = 0; i < g.numFrames; i++) {
    const wasmFrame = g.frame(i);
    frames.push({ imageData: wasmFrame.imageData, delay: wasmFrame.delay });
  }

  return {
    canvasWidth: g.canvasWidth,
    canvasHeight: g.canvasHeight,
    maxLoops: g.maxLoops,
    numFrames: g.numFrames,
    bgColor: g.bgColor,
    frames,
  };
}

export async function prepareImageData(gif: Gif): Promise<ImageData[]> {
  const frameArr: ImageData[] = [];

  for (const frame of gif.frames) {
    let ui8ca: Uint8ClampedArray;
    if (import.meta.env.FIREFOX) {
      /* Because of security context BS in Firefox (not Chrome, oddly enough), I can't just create
       * an `ImageData` directly from `gif.frame(i).imageData`; the security context of the
       * content script is different from the canvas, so `ctx.putImageData()` fails. Solution is
       * use `window.Uint8ClampedArray`, copying the data over using `Blob`s (MUCH faster than JS
       * arrays). */
      const blob = new Blob([frame.imageData], { type: "octet/stream" });
      ui8ca = new window.self.Uint8ClampedArray(await blob.arrayBuffer());
    } else {
      ui8ca = new window.self.Uint8ClampedArray(frame.imageData);
    }

    frameArr.push(new ImageData(ui8ca, gif.canvasWidth, gif.canvasHeight));
  }
  return frameArr;
}
