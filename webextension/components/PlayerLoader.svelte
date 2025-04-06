<script lang="ts">
  import iconRevert from "@/assets/player-icons/revert.svg";

  import { browser } from "#imports";
  import { onDestroy } from "svelte";

  import type { WorkerInput, WorkerOutput } from "@/entrypoints/worker";
  import { DECODE_WORKER_PATH, WASM_NAME } from "@/lib/constants";
  import { decode, type Gif, prepareImageData } from "@/lib/gif";
  import { opts } from "@/lib/options";

  import IconButton from "./IconButton.svelte";
  import Player from "./Player.svelte";

  type Props = {
    source: string;
    unmount: () => void;
    defaultWidth: number;
    defaultHeight: number;
  };
  let { source, unmount, defaultWidth, defaultHeight }: Props = $props();

  let stateText = $state("Loading...");

  let worker: Worker;
  let objectUrl: string;

  onDestroy(() => {
    if (worker !== undefined) {
      worker.terminate();
    }
    if (objectUrl !== undefined) {
      URL.revokeObjectURL(objectUrl);
    }
  });

  const loadingBackground = (color: string) =>
    `linear-gradient(${color}, ${color}), url("${source}")`;

  async function loadGif() {
    const response = await fetch(source);
    if (!response.ok)
      throw new Error(`Could not fetch image: ${response.status} ${response.statusText}`);
    const bytes = await response.bytes();

    stateText = "Decoding...";
    const gif = (await opts.decodeInBackground.getValue())
      ? await decodeInWorker(bytes)
      : await decode(bytes, browser.runtime.getURL(`/${WASM_NAME}`));

    stateText = "Processing...";
    const frameArr = await prepareImageData(gif);

    return { gif, frameArr };
  }

  async function decodeInWorker(bytes: Uint8Array): Promise<Gif> {
    // Get around an *old* chrome issue: https://issues.chromium.org/issues/41098022
    const r = await fetch(browser.runtime.getURL(DECODE_WORKER_PATH));
    const blob = new Blob([await r.text()], { type: "text/javascript" });
    objectUrl = URL.createObjectURL(blob);
    worker = new Worker(objectUrl);

    return new Promise<Gif>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
        switch (e.data.type) {
          case "ok":
            resolve(e.data.output);
            break;
          case "error":
            reject(e.data.error);
            break;
          default:
            reject(new Error("unexpected message!"));
        }
      };

      worker.postMessage({
        wasm_path: browser.runtime.getURL(`/${WASM_NAME}`),
        bytes,
      } satisfies WorkerInput);
    });
  }
</script>

{#snippet revertButton()}
  <div class="player-controls controls-top">
    <IconButton title="Revert" src={iconRevert} onclick={unmount} style="padding: 2px 2px 1px" />
  </div>
{/snippet}

{#await loadGif()}
  <div class="bgimg" style:background-image={loadingBackground("#666c")}>
    {stateText}
    {@render revertButton()}
  </div>
{:then result}
  <Player {...result} {unmount} {defaultWidth} {defaultHeight} />
{:catch e}
  <div class="bgimg" style:background-image={loadingBackground("#a008")}>
    <div>Error!</div>
    <div>{e instanceof Error && e.name === "Error" ? e.message : e}</div>
    {@render revertButton()}
  </div>
{/await}
