import type { BlobFrame, GifMeta, BlobUrlFrame } from "./gif";

type RightClickMessage = {
  name: "right-click";
  targetElementId?: number;
};

type OpenOptionsMessage = {
  name: "open-options";
};

type DecodeRequestUi8aMessage = {
  name: "decode-request-ui8a";
  content: Uint8Array;
  wasm_path: string;
};

type DecodeRequestBlobMessage = {
  name: "decode-request-blob";
  blob: Blob;
  wasm_path: string;
};

type DecodeResponseBlobMessage = {
  name: "decode-response-blob";
  meta: GifMeta;
  frames: BlobFrame[];
};

type DecodeRequestBlobUrlMessage = {
  name: "decode-request-blob-url";
  target: "background" | "offscreen";
  url: string;
  wasm_path: string;
};

type DecodeResponseBlobUrlMessage = {
  name: "decode-response-blob-url";
  meta: GifMeta;
  frames: BlobUrlFrame[];
};

type DecodeResponseErrorMessage = {
  name: "decode-response-error";
  error: string;
};

export type Message =
  | RightClickMessage
  | OpenOptionsMessage
  | DecodeRequestUi8aMessage
  | DecodeRequestBlobMessage
  | DecodeResponseBlobMessage
  | DecodeRequestBlobUrlMessage
  | DecodeResponseBlobUrlMessage
  | DecodeResponseErrorMessage;

export function isMessage(m: unknown): m is Message {
  return m instanceof Object && "name" in m;
}
