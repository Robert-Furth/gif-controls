<script lang="ts">
  import { browser } from "#imports";
  import { slide } from "svelte/transition";

  import type { Message } from "@/lib/messages";
  import type { CounterType } from "@/lib/options";
  import { swallowEvents } from "@/lib/utils";

  type Props = {
    speedFactor: number;
    counterType: CounterType;
    reverse: boolean;
    lockPosition: boolean;
  } & Record<string, unknown>;
  let {
    speedFactor = $bindable(),
    counterType = $bindable(),
    reverse = $bindable(),
    lockPosition = $bindable(),
    ...rest
  }: Props = $props();

  function openOptionsPage(e: Event) {
    swallowEvents(e);
    void browser.runtime.sendMessage({ name: "open-options" } satisfies Message);
  }
</script>

<div
  transition:slide={{ axis: "y" }}
  class="options-dropdown"
  onkeydown={swallowEvents}
  onclick={swallowEvents}
  {...rest}
>
  <div class="right">Speed:</div>
  <div class="speed-control">
    <input type="range" min="0.25" max="2" step="0.25" bind:value={speedFactor} />
    {(speedFactor * 100).toFixed(0)}%
  </div>
  <div class="right">Counter:</div>
  <div>
    <select bind:value={counterType}>
      <option value="time">Time</option>
      <option value="frame">Frame</option>
      <option value="none">None</option>
    </select>
  </div>
  <label class="span">Reverse: <input type="checkbox" bind:checked={reverse} /></label>
  <label class="span"
    >Lock Size &amp; Position: <input type="checkbox" bind:checked={lockPosition} /></label
  >
  <!-- svelte-ignore a11y_invalid_attribute -->
  <a class="span" href="#" onclick={openOptionsPage}>Extension Options...</a>
</div>
