<script lang="ts">
  import iconRevert from "@/assets/player-icons/revert.svg";

  import { browser } from "#imports";

  import { WASM_NAME } from "@/lib/constants";
  import { decodeInBackground, prepareImageData } from "@/lib/gif";

  import BackgroundImage from "./BackgroundImage.svelte";
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

  async function loadGif() {
    const response = await fetch(source);

    if (!response.ok)
      throw new Error(`Could not fetch image: ${response.status} ${response.statusText}`);
    const bytes = await response.bytes();

    stateText = "Decoding...";
    const gif = await decodeInBackground(bytes, browser.runtime.getURL(`/${WASM_NAME}`));

    stateText = "Processing...";
    const frameArr = await prepareImageData(gif);

    return { gif, frameArr };
  }
</script>

{#snippet revertButton()}
  <div class="player-controls controls-top">
    <IconButton title="Revert" src={iconRevert} onclick={unmount} style="padding: 2px 2px 1px" />
  </div>
{/snippet}

{#await loadGif()}
  <BackgroundImage width={defaultWidth} height={defaultHeight} url={source} overlay="#666c">
    {stateText}
    {@render revertButton()}
  </BackgroundImage>
{:then result}
  <Player {...result} {unmount} {defaultWidth} {defaultHeight} />
{:catch e}
  <BackgroundImage width={defaultWidth} height={defaultHeight} url={source} overlay="#a008">
    <div>Error!</div>
    <div>{e?.message ?? e}</div>
    {@render revertButton()}
  </BackgroundImage>
{/await}
