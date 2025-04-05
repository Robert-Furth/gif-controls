import { defineUnlistedScript } from "#imports";

import { decode, Gif } from "@/lib/gif";

export type WorkerInput = {
  wasm_path: string;
  bytes: Uint8Array;
};

type WorkerOutputOk = {
  type: "ok";
  output: Gif;
};

type WorkerOutputErr = {
  type: "error";
  error: unknown;
};

export type WorkerOutput = WorkerOutputOk | WorkerOutputErr;

export default defineUnlistedScript(() => {
  onmessage = async (e: MessageEvent<WorkerInput>) => {
    try {
      const gif = await decode(e.data.bytes, e.data.wasm_path);
      postMessage({ type: "ok", output: gif } satisfies WorkerOutputOk);
    } catch (e) {
      postMessage({ type: "error", error: e } satisfies WorkerOutputErr);
    }
    close();
  };
});
