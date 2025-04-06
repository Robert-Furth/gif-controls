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
  error: Error;
};

export type WorkerOutput = WorkerOutputOk | WorkerOutputErr;

function asError(e: unknown): Error {
  if (e instanceof Error) return e;
  return new Error(JSON.stringify(e));
}

export default defineUnlistedScript(() => {
  onmessage = async (e: MessageEvent<WorkerInput>) => {
    try {
      const gif = await decode(e.data.bytes, e.data.wasm_path);
      postMessage({ type: "ok", output: gif } satisfies WorkerOutputOk);
    } catch (err) {
      postMessage({ type: "error", error: asError(err) } satisfies WorkerOutputErr);
    }
    close();
  };
});
