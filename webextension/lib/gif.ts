import { browser } from "#imports";

import init, { decode as wasmDecode } from "@@/decoder/pkg/gif_controls_decoder";

import { isMessage, Message } from "./messages";
import { createBlobUrl } from "./utils";

type FrameCommon = { delay: number };

export type Frame = FrameCommon & { imageData: Uint8Array };
export type SerializedFrame = FrameCommon & { blobUrl: string };

export type GifMeta = {
  canvasWidth: number;
  canvasHeight: number;
  maxLoops?: number;
  numFrames: number;
  bgColor: string;
};

export type Gif = GifMeta & {
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
  if (import.meta.env.FIREFOX) {
    /* Because of security context BS in Firefox (not Chrome, oddly enough), I can't just create an
     * `ImageData` directly from `gif.frame(i).imageData`; the security context of the content
     * script is different from the canvas, so `ctx.putImageData()` fails. Solution is use
     * `window.Uint8ClampedArray`, copying the data over using `Blob`s (MUCH faster than JS arrays).
     * */
    const promises = gif.frames.map(async ({ imageData }) => {
      const blob = new Blob([imageData], { type: "application/octet-stream" });
      const ui8ca = new window.self.Uint8ClampedArray(await blob.arrayBuffer());
      return new ImageData(ui8ca, gif.canvasWidth, gif.canvasHeight);
    });
    return await Promise.all(promises);
  } else {
    return gif.frames.map((frame) => {
      const ui8ca = new window.self.Uint8ClampedArray(frame.imageData);
      return new ImageData(ui8ca, gif.canvasWidth, gif.canvasHeight);
    });
  }
}

async function deserializeFrames(frames: SerializedFrame[]): Promise<Frame[]> {
  const promises = frames.map(async (frame) => ({
    delay: frame.delay,
    imageData: await fetch(frame.blobUrl)
      .then((response) => response.bytes())
      .finally(() => URL.revokeObjectURL(frame.blobUrl)),
  }));

  return await Promise.all(promises);
}

export async function decodeInBackground(arr: Uint8Array, wasm_path: string): Promise<Gif> {
  const message: Message = import.meta.env.FIREFOX
    ? { name: "decode-request-ui8a", content: arr, wasm_path }
    : { name: "decode-request-blob-url", target: "background", url: createBlobUrl(arr), wasm_path };

  const response: unknown = await browser.runtime.sendMessage(message);
  if (!isMessage(response)) throw new Error("Unexpected response");

  switch (response.name) {
    case "decode-response-error":
      throw new Error(response.error);

    case "decode-response-ui8a":
      return response.gif;

    case "decode-response-blob-url":
      return { ...response.meta, frames: await deserializeFrames(response.frames) };

    default:
      throw new Error("Unexpected response");
  }
}
