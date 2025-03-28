<script lang="ts">
  import iconRevert from "@/assets/player-icons/revert.svg";

  import { onDestroy } from "svelte";
  import { browser } from "wxt/browser";

  import { WorkerInput, WorkerOutput } from "@/entrypoints/worker";
  import { DECODE_WORKER_PATH, WASM_NAME } from "@/lib/constants";
  import { decode, Gif, prepareImageData } from "@/lib/gif";
  import { opts } from "@/lib/options";

  import IconButton from "./IconButton.svelte";
  import Player from "./Player.svelte";

  type Props = { source: string; unmount: () => void };
  let { source, unmount }: Props = $props();

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

  function stopEvent(e: Event) {
    e.preventDefault();
    e.stopPropagation();
  }

  const loadingBackground = (color: any) => `linear-gradient(${color}, ${color}), url("${source}")`;

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
            reject("unexpected message!");
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

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="wrapper" onclick={stopEvent}>
  {#await loadGif()}
    <div class="bgimg" style:background-image={loadingBackground("#aaa8")}>
      {stateText}
      {@render revertButton()}
    </div>
  {:then result}
    <Player {...result} {unmount} />
  {:catch e}
    {@debug e}
    <div class="bgimg" style:background-image={loadingBackground("#a008")}>
      <div>Error!</div>
      <div>{e instanceof Error && e.name === "Error" ? e.message : e}</div>
      {@render revertButton()}
    </div>
  {/await}
</div>
