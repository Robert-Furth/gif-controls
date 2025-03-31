<script lang="ts">
  import iconNextFrame from "@/assets/player-icons/next-frame.svg";
  import iconOptions from "@/assets/player-icons/options.svg";
  import iconPause from "@/assets/player-icons/pause.svg";
  import iconPlay from "@/assets/player-icons/play.svg";
  import iconPrevFrame from "@/assets/player-icons/prev-frame.svg";
  import iconResetSize from "@/assets/player-icons/reset-size.svg";
  import iconRevert from "@/assets/player-icons/revert.svg";

  import { onMount } from "svelte";

  import { type Gif } from "@/lib/gif";
  import { type CounterType, opts, watchOption } from "@/lib/options";

  import IconButton from "./IconButton.svelte";
  import Options from "./Options.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import Resizer from "./Resizer.svelte";

  type Props = {
    gif: Gif;
    frameArr: ImageData[];
    unmount: () => void;
    defaultWidth: number;
    defaultHeight: number;
  };
  let { gif, frameArr, unmount, defaultWidth, defaultHeight }: Props = $props();

  let canvas: HTMLCanvasElement;

  let frameIndex = $state(0);
  let progressMs = $state(0);

  let isPaused = $state(false);
  let isScrubbing = $state(false);
  let optionsOpen = $state(false);
  let forceShow = $derived(isScrubbing || optionsOpen);

  // Player options
  let speedFactor = $state(1);
  let counterType: CounterType = $state("none");
  let reverse = $state(false);

  let minDelay = watchOption(opts.minFrameTime);

  let timestamps = $derived.by(() => {
    const ts = [0];
    for (let i = 0; i < gif.numFrames; i++) {
      const delay = Math.max(gif.frames[i].delay, $minDelay) * 10;
      ts.push(ts[i] + delay);
    }
    return ts;
  });
  let durationMs = $derived(timestamps[timestamps.length - 1]);
  let skipAmount = $derived(Math.min(durationMs / 6, 1000));

  let curWidth = $state(defaultWidth);
  let curHeight = $state(defaultHeight);
  let cssOffsX = $derived((defaultWidth - curWidth) / 2);

  const isAnimated = gif.numFrames > 1;

  /* Animation variables.
   * Not used for reactivity, so it's fine they're not $state vars. Plus, making animationHandle a
   * $state var made it so the cancelAnimationFrame() call in onDestroy() didn't work. */
  let prevTime: DOMHighResTimeStamp | undefined;
  let animationHandle: number | undefined;

  // Init the canvas
  onMount(() => {
    canvas.width = gif.canvasWidth;
    canvas.height = gif.canvasHeight;
  });

  // Start animating
  onMount(() => {
    if (isAnimated) {
      animationHandle = requestAnimationFrame(animate);
      return () => {
        cancelAnimationFrame(animationHandle!);
      };
    }
  });

  // Handle options
  onMount(() => {
    opts.defaultCounterType.getValue().then((v) => (counterType = v));
  });

  // Update canvas on frameIndex update
  $effect(() => {
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      ctx.imageSmoothingEnabled = false;
      ctx.putImageData(frameArr[frameIndex], 0, 0);
    }
  });

  // Main animation function
  async function animate(curTime: DOMHighResTimeStamp) {
    await (async () => {
      if (isPaused || isScrubbing || prevTime === undefined) {
        return;
      }

      const elapsed = (curTime - prevTime) * speedFactor;
      progressMs += reverse ? -elapsed : elapsed;

      const maybeFrameIndex = timestampToFrame(progressMs);
      if (maybeFrameIndex === "start") {
        frameIndex = gif.numFrames - 1;
        progressMs = durationMs;
      } else if (maybeFrameIndex === "end") {
        frameIndex = 0;
        progressMs = 0;
      } else {
        frameIndex = maybeFrameIndex;
      }
    })();

    prevTime = curTime;
    animationHandle = requestAnimationFrame(animate);
  }

  /* HELPERS */

  /** Helper that converts a timestamp to a frame number, or `"start"`/`"end"` for under/overflows */
  function timestampToFrame(ms: number): number | "start" | "end" {
    if (ms < 0) return "start";

    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] > ms) {
        return i - 1;
      }
    }
    return "end";
  }

  /** Like `timestampToFrame()`, but saturates instead of reporting under/overflows */
  function timestampToFrameSaturate(ms: number): number {
    const maybeFrameIndex = timestampToFrame(ms);
    if (maybeFrameIndex === "start") return 0;
    if (maybeFrameIndex === "end") return gif.numFrames - 1;
    return maybeFrameIndex;
  }

  /** Convert a millisecond to a timestamp in seconds and possibly minutes */
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

  /** Adds `a + b % mod`, wrapping around if a + b is negative. */
  function addWraparound(a: number, b: number, mod: number): number {
    let intermediate = (a + b) % mod;
    if (intermediate < 0) {
      return mod + intermediate;
    }
    return intermediate;
  }

  /* EVENTS */

  function incFrame() {
    frameIndex = frameIndex === gif.numFrames - 1 ? 0 : frameIndex + 1;
    progressMs = timestamps[frameIndex];
  }

  function decFrame() {
    frameIndex = frameIndex === 0 ? gif.numFrames - 1 : frameIndex - 1;
    progressMs = timestamps[frameIndex];
  }

  function onkeydown(this: HTMLElement, e: KeyboardEvent) {
    if (e.target !== this) return;
    e.stopPropagation();

    switch (e.key) {
      case "ArrowRight": {
        if (e.shiftKey) {
          incFrame();
        } else {
          progressMs = addWraparound(progressMs, skipAmount, durationMs);
          frameIndex = timestampToFrameSaturate(progressMs);
        }
        break;
      }
      case "ArrowLeft": {
        if (e.shiftKey) {
          decFrame();
        } else {
          progressMs = addWraparound(progressMs, -skipAmount, durationMs);
          frameIndex = timestampToFrameSaturate(progressMs);
        }
        break;
      }
      case " ": {
        if (!e.repeat) isPaused = !isPaused;
        break;
      }
      default:
        return;
    }

    e.preventDefault();
  }
</script>

<div
  class="wrapper"
  role="application"
  style:width="{curWidth}px"
  style:height="{curHeight}px"
  style:left="{cssOffsX}px"
>
  <canvas tabindex="0" {onkeydown} onclick={() => (isPaused = !isPaused)} bind:this={canvas}
  ></canvas>
  <div class={["player-controls", "controls-top", forceShow && "force-show"]}>
    <IconButton title="Revert" src={iconRevert} onclick={unmount} style="padding: 2px 2px 1px" />
    <div>
      <IconButton title="Options" src={iconOptions} onclick={() => (optionsOpen = !optionsOpen)} />
      {#if optionsOpen}
        <div style="position: relative; top: var(--controls-padding);">
          <Options bind:speedFactor bind:counterType bind:reverse />
        </div>
      {/if}
    </div>
    {#if curWidth !== defaultWidth || curHeight !== defaultHeight}
      <IconButton
        title="Reset Size"
        src={iconResetSize}
        style="padding: 2px;"
        onclick={() => {
          curWidth = defaultWidth;
          curHeight = defaultHeight;
        }}
      />
    {/if}
  </div>
  <div class={["player-controls", "controls-bottom", forceShow && "force-show"]}>
    <IconButton
      title="Previous Frame"
      src={iconPrevFrame}
      disabled={!isPaused}
      onclick={decFrame}
    />
    <IconButton
      title={isPaused ? "Play" : "Pause"}
      src={isPaused ? iconPlay : iconPause}
      onclick={() => (isPaused = !isPaused)}
      disabled={!isAnimated}
    />
    <IconButton title="Next Frame" src={iconNextFrame} disabled={!isPaused} onclick={incFrame} />
    <ProgressBar
      bind:val={progressMs}
      max={durationMs}
      editable={isAnimated}
      {onkeydown}
      aria-label="Seek"
      aria-value=""
      onScrub={() => {
        isScrubbing = true;
        frameIndex = timestampToFrameSaturate(progressMs);
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
    <Resizer bind:width={curWidth} bind:height={curHeight} />
  </div>
</div>
