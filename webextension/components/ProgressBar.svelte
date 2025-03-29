<script lang="ts">
  type Props = {
    val: number;
    max: number;
    editable?: boolean;
    onScrub?: (val: number) => void;
    onScrubEnd?: () => void;
  } & Record<string, unknown>;
  let {
    val = $bindable(0),
    max = 100,
    editable = true,
    onScrub,
    onScrubEnd,
    ...rest
  }: Props = $props();

  let progressBar: HTMLDivElement;
  let isScrubbing = $state(false);
  let progressPct = $derived((val / max) * 100);

  function onChangeOuter(clientX: number) {
    const { left, width } = progressBar.getBoundingClientRect();
    const clickedPercent = (clientX - left) / width;
    const clampedPercent = Math.max(0, Math.min(clickedPercent, 1));

    val = clampedPercent * max;
    onScrub?.(val);
  }

  function startScrubbing(e: MouseEvent) {
    if (editable && e.buttons === 1) {
      isScrubbing = true;
      e.preventDefault();
      onChangeOuter(e.clientX);
    }
  }

  function keepScrubbing(e: MouseEvent) {
    if (editable && isScrubbing) {
      e.preventDefault();
      onChangeOuter(e.clientX);
    }
  }

  function endScrubbing() {
    if (editable) {
      isScrubbing = false;
      onScrubEnd?.();
    }
  }
</script>

<svelte:window onmouseup={endScrubbing} onmousemove={keepScrubbing} />

<div
  class={["progress-bar", editable && "editable"]}
  onmousedown={startScrubbing}
  bind:this={progressBar}
  role="slider"
  tabindex="0"
  aria-valuenow={val}
  aria-valuemax={max}
  {...rest}
>
  <div style:width="{progressPct}%"></div>
</div>
