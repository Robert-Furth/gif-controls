import { browser } from "#imports";

import { decode, SerializedFrame } from "@/lib/gif";
import { isMessage, Message } from "@/lib/messages";
import { createBlobUrl } from "@/lib/utils";

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    !isMessage(message) ||
    message.name !== "decode-request-blob-url" ||
    message.target !== "offscreen"
  )
    return;

  fetch(message.url)
    .then((response) => response.bytes())
    .then((bytes) => decode(bytes, message.wasm_path))
    .then((gif) => {
      const { frames, ...meta } = gif;
      const serializedFrames: SerializedFrame[] = frames.map((frame) => ({
        delay: frame.delay,
        blobUrl: createBlobUrl(frame.imageData),
      }));
      sendResponse({
        name: "decode-response-blob-url",
        meta,
        frames: serializedFrames,
      } satisfies Message);
    })
    .catch((e) => sendResponse({ name: "decode-response-error", error: `${e}` } satisfies Message))
    .finally(() => URL.revokeObjectURL(message.url));

  return true;
});
