<script lang="ts">
  import { swallowEvents } from "@/lib/utils";
  import type { Snippet } from "svelte";

  type Props = {
    width: number;
    height: number;
    url: string;
    overlay: string;
    children?: Snippet;
  };
  let { width, height, url, overlay = "transparent", children }: Props = $props();
  const background = `linear-gradient(${overlay}, ${overlay}), url("${url}")`;
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="wrapper bgimg"
  style:width="{width}px"
  style:height="{height}px"
  style:background-image={background}
  onclick={swallowEvents}
  onkeydown={swallowEvents}
>
  {#if children}
    {@render children()}
  {/if}
</div>
