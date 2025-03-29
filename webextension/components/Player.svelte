<script lang="ts">
  import iconNextFrame from "@/assets/player-icons/next-frame.svg";
  import iconOptions from "@/assets/player-icons/options.svg";
  import iconPause from "@/assets/player-icons/pause.svg";
  import iconPlay from "@/assets/player-icons/play.svg";
  import iconPrevFrame from "@/assets/player-icons/prev-frame.svg";
  import iconRevert from "@/assets/player-icons/revert.svg";

  import { onMount } from "svelte";
  import { type Unwatch } from "wxt/storage";

  import { type Gif } from "@/lib/gif";
  import { type CounterType, opts } from "@/lib/options";

  import IconButton from "./IconButton.svelte";
  import Options from "./Options.svelte";
  import ProgressBar from "./ProgressBar.svelte";

  type Props = {
    gif: Gif;
    frameArr: ImageData[];
    unmount: () => void;
  };
  let { gif, frameArr, unmount }: Props = $props();

  let canvas: HTMLCanvasElement;

  let frameIndex = $state(0);
  let progressMs = $state(0);

  let isPaused = $state(false);
  let isScrubbing = $state(false);

  let optionsOpen = $state(false);
  let speedFactor = $state(1);
  let counterType: CounterType = $state("none");
  let minDelay = $state(2);

  let forceShow = $derived(isScrubbing || optionsOpen);

  let timestamps = $derived.by(() => {
    const ts = [0];
    for (let i = 0; i < gif.numFrames; i++) {
      const delay = Math.max(gif.frames[i].delay, minDelay) * 10;
      ts.push(ts[i] + delay);
    }
    return ts;
  });
  let durationMs = $derived(timestamps[timestamps.length - 1]);

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
    const unsubs: Unwatch[] = [];

    opts.defaultCounterType.getValue().then((v) => (counterType = v));

    opts.minFrameTime.getValue().then((v) => (minDelay = v));
    unsubs.push(opts.minFrameTime.watch((v) => (minDelay = v)));

    return () => unsubs.forEach((unsub) => unsub());
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
