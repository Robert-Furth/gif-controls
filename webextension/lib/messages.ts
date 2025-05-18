import type { Gif, GifMeta, SerializedFrame } from "./gif";

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

type DecodeResponseUi8aMessage = {
  name: "decode-response-ui8a";
  gif: Gif;
};

type DecodeRequestBlobMessage = {
  name: "decode-request-blob-url";
  target: "background" | "offscreen";
  url: string;
  wasm_path: string;
};

type DecodeResponseBlobMessage = {
  name: "decode-response-blob-url";
  meta: GifMeta;
  frames: SerializedFrame[];
};

type DecodeResponseErrorMessage = {
  name: "decode-response-error";
  error: string;
};

export type Message =
  | RightClickMessage
  | OpenOptionsMessage
  | DecodeRequestUi8aMessage
  | DecodeResponseUi8aMessage
  | DecodeRequestBlobMessage
  | DecodeResponseBlobMessage
  | DecodeResponseErrorMessage;

export function isMessage(m: unknown): m is Message {
  return m instanceof Object && "name" in m;
}
