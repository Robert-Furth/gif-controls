<script lang="ts">
  import { slide } from "svelte/transition";

  import type { CounterType } from "@/lib/options";

  type Props = {
    speedFactor?: number;
    counterType?: CounterType;
  } & Record<string, any>;
  let { speedFactor = $bindable(1), counterType = $bindable("frame"), ...rest }: Props = $props();
</script>

<div transition:slide={{ axis: "x" }} class="options-dropdown" {...rest}>
  <div class="right">Speed:</div>
  <div class="speed-control">
    <input type="range" min="0.25" max="2" step="0.25" bind:value={speedFactor} />
    {(speedFactor * 100).toFixed(0)}%
  </div>
  <div class="right">Counter:</div>
  <div>
    <select bind:value={counterType}>
      <option value="frame">Frame</option>
      <option value="time">Time</option>
      <option value="none">None</option>
    </select>
  </div>
</div>
