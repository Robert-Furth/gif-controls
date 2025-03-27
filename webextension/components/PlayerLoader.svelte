<script lang="ts">
  import iconRevert from "@/assets/player-icons/revert.svg";

  import { browser } from "wxt/browser";

  import init, { decode } from "@@/decoder/pkg/gif_controls_decoder";

  import { WASM_NAME } from "@/utils/constants";
  import type { PlayerOptions } from "@/utils/options";

  import IconButton from "./IconButton.svelte";
  import Player from "./Player.svelte";

  type Props = { source: string; options: PlayerOptions; unmount: () => void };
  let { source, options, unmount }: Props = $props();

  function stopEvent(e: Event) {
    e.preventDefault();
    e.stopPropagation();
  }

  const loadingBackground = (color: any) => `linear-gradient(${color}, ${color}), url("${source}")`;

  async function loadGif() {
    await init({ module_or_path: browser.runtime.getURL(`/${WASM_NAME}`) });

    const response = await fetch(source);
    if (!response.ok)
      throw new Error(`Could not fetch image: ${response.status} ${response.statusText}`);

    const bytes = await response.bytes();
    const gif = decode(bytes);

    const frameArr = [];
    for (let i = 0; i < gif.numFrames; i++) {
      const frameBytes = gif.frame(i).imageData;

      let ui8ca: Uint8ClampedArray;
      if (import.meta.env.FIREFOX) {
        /* Because of security context BS in Firefox (not Chrome, oddly enough), I can't just create
         * an `ImageData` directly from `gif.frame(i).imageData`; the security context of the
         * content script is different from the canvas, so `ctx.putImageData()` fails. Solution is
         * use `window.Uint8ClampedArray`, copying the data over using `Blob`s (MUCH faster than JS
         * arrays). */
        const blob = new Blob([frameBytes], { type: "octet/stream" });
        ui8ca = new window.Uint8ClampedArray(await blob.arrayBuffer());
      } else {
        ui8ca = new window.Uint8ClampedArray(frameBytes);
      }

      frameArr.push(new ImageData(ui8ca, gif.canvasWidth, gif.canvasHeight));
    }

    return { gif, frameArr };
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
      Loading...
      {@render revertButton()}
    </div>
  {:then result}
    <Player {...result} {options} {unmount} />
  {:catch e}
    <div class="bgimg" style:background-image={loadingBackground("#a008")}>
      <div>Error!</div>
      <div>{e instanceof Error && e.name === "Error" ? e.message : e}</div>
      {@render revertButton()}
    </div>
  {/await}
</div>
