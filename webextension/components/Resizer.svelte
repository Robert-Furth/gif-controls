<script lang="ts">
  import resizeSrc from "@/assets/player-icons/resize-handle.svg";

  import { opts, watchOption } from "@/lib/options";

  type Props = { width: number; height: number };
  let { width = $bindable(), height = $bindable() }: Props = $props();

  let isResizing = $state(false);
  const aspectRatio = width / height;

  let minWidth = watchOption(opts.minPlayerWidth);
  let minHeight = watchOption(opts.minPlayerHeight);

  function resize(e: MouseEvent) {
    if (!isResizing) return;

    const dx = e.movementX;
    const dy = e.movementY;
    let newWidth: number, newHeight: number;

    if (Math.abs(dx) > Math.abs(dy)) {
      newWidth = width + dx;
      newHeight = newWidth / aspectRatio;
    } else {
      newHeight = height + dy;
      newWidth = newHeight * aspectRatio;
    }

    if (newWidth < $minWidth) {
      newWidth = $minWidth;
      newHeight = newWidth / aspectRatio;
    }
    if (newHeight < $minHeight) {
      newHeight = $minHeight;
      newWidth = newHeight * aspectRatio;
    }

    width = newWidth;
    height = newHeight;
  }
</script>

<svelte:window onmouseup={() => (isResizing = false)} onmousemove={resize} />

<div class="resize-handle" role="presentation" onmousedown={() => (isResizing = true)}>
  <!-- svelte-ignore a11y_missing_attribute -->
  <img src={resizeSrc} draggable="false" />
</div>
