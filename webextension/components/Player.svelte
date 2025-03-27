<script lang="ts">
  import iconNextFrame from "@/assets/player-icons/next-frame.svg";
  import iconOptions from "@/assets/player-icons/options.svg";
  import iconPause from "@/assets/player-icons/pause.svg";
  import iconPlay from "@/assets/player-icons/play.svg";
  import iconPrevFrame from "@/assets/player-icons/prev-frame.svg";
  import iconRevert from "@/assets/player-icons/revert.svg";

  import { onDestroy, onMount } from "svelte";

  import { DecodedGif } from "@@/decoder/pkg/gif_controls_decoder";

  import type { PlayerOptions } from "@/utils/options";

  import IconButton from "./IconButton.svelte";
  import Options from "./Options.svelte";
  import ProgressBar from "./ProgressBar.svelte";

  type Props = {
    gif: DecodedGif;
    frameArr: ImageData[];
    unmount: () => void;
    options: PlayerOptions;
  };
  let { gif, frameArr, unmount, options }: Props = $props();

  const MIN_DELAY = 2;

  let canvas: HTMLCanvasElement;

  let frameIndex = $state(0);
  let progressMs = $state(0);

  let isPaused = $state(false);
  let isScrubbing = $state(false);

  let optionsOpen = $state(false);
  let speedFactor = $state(1);
  let counterType = $state(options.defaultCounterType);

  let forceShow = $derived(isScrubbing || optionsOpen);

  /** `timestamps[i]` = start time for frame `i` */
  const timestamps: number[] = [0];
  for (let i = 0; i < gif.numFrames; i++) {
    const delay = Math.max(gif.frame(i).delay, MIN_DELAY) * 10;
    timestamps.push(timestamps[i] + delay);
  }
  const durationMs = timestamps[timestamps.length - 1];
  const isAnimated = gif.numFrames > 1;

  /* Animation variables.
   * Not used for reactivity, so it's fine they're not $state vars. Plus, making animationHandle a
   * $state var made it so the cancelAnimationFrame() call in onDestroy() didn't work. */
  let prevTime: DOMHighResTimeStamp | undefined;
  let animationHandle: number | undefined;

  onMount(() => {
    // Init the canvas
    canvas.width = gif.canvasWidth;
    canvas.height = gif.canvasHeight;

    // Start animating
    if (isAnimated) {
      animationHandle = requestAnimationFrame(animate);
    }
  });

  onDestroy(() => {
    // Stop animating when the component is unmounted
    if (animationHandle !== undefined) {
      cancelAnimationFrame(animationHandle);
    }
  });

  // Update canvas on frameIndex update
  $effect(() => {
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      ctx.imageSmoothingEnabled = false;
      ctx.putImageData(frameArr[frameIndex], 0, 0);
    }
  });

  async function animate(curTime: DOMHighResTimeStamp) {
    await (async () => {
      if (isPaused || isScrubbing || prevTime === undefined) {
        return;
      }

      progressMs += (curTime - prevTime) * speedFactor;
      const maybeFrameIndex = timestampToFrame(progressMs);
      if (maybeFrameIndex === null) {
        // Loop
        frameIndex = 0;
        progressMs = 0;
      } else {
        frameIndex = maybeFrameIndex;
      }
    })();

    prevTime = curTime;
    animationHandle = requestAnimationFrame(animate);
  }

  function timestampToFrame(ms: number): number | null {
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] > ms) {
        return i - 1;
      }
    }
    return null;
  }

  function msToMinSec(ms: number): string {
    const mins = Math.floor(ms / 60000);
    const secs = (ms % 60000) / 1000;

    let secsStr = secs.toFixed(1);
    if (durationMs >= 60000) {
      if (secsStr[1] === ".") secsStr = "0" + secsStr;
      return `${mins}:${secsStr}`;
    }
    return secsStr;
  }
</script>

<canvas bind:this={canvas}></canvas>
<div class={["player-controls", "controls-top", forceShow && "force-show"]}>
  <IconButton title="Revert" src={iconRevert} onclick={unmount} style="padding: 2px 2px 1px" />
  <IconButton title="Options" src={iconOptions} onclick={() => (optionsOpen = !optionsOpen)} />
  {#if optionsOpen}
    <div style="position: relative; align-self: flex-start;">
      <Options bind:speedFactor bind:counterType />
    </div>
  {/if}
</div>
<div class={["player-controls", "controls-bottom", forceShow && "force-show"]}>
  <IconButton
    title="Previous Frame"
    src={iconPrevFrame}
    disabled={!isPaused}
    onclick={() => {
      frameIndex = frameIndex === 0 ? gif.numFrames - 1 : frameIndex - 1;
      progressMs = timestamps[frameIndex];
    }}
  />
  <IconButton
    title={isPaused ? "Play" : "Pause"}
    src={isPaused ? iconPlay : iconPause}
    onclick={() => (isPaused = !isPaused)}
    disabled={!isAnimated}
  />
  <IconButton
    title="Next Frame"
    src={iconNextFrame}
    disabled={!isPaused}
    onclick={() => {
      frameIndex = frameIndex === gif.numFrames - 1 ? 0 : frameIndex + 1;
      progressMs = timestamps[frameIndex];
    }}
  />
  <ProgressBar
    bind:val={progressMs}
    max={durationMs}
    onChanged={(ts) => {
      isScrubbing = true;
      frameIndex = timestampToFrame(ts) ?? gif.numFrames - 1;
    }}
    onScrubEnd={() => (isScrubbing = false)}
  />
  {#if counterType === "frame"}
    <div class="frame-counter" style:flex-basis="{gif.numFrames.toString().length}ch">
      {frameIndex + 1}
    </div>
  {:else if counterType === "time"}
    <div class="frame-counter" style:flex-basis="{msToMinSec(durationMs).length - 0.25}ch">
      {msToMinSec(progressMs)}
    </div>
  {/if}
</div>
