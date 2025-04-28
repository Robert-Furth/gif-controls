<script lang="ts">
  import moveSrc from "@/assets/player-icons/move-handle.svg";

  type Props = { x: number; y: number };
  let { x = $bindable(), y = $bindable() }: Props = $props();

  let isMoving = $state(false);

  let prevX: number | undefined;
  let prevY: number | undefined;

  function startMove(e: MouseEvent) {
    isMoving = true;
    prevX = e.clientX;
    prevY = e.clientY;
  }

  function stopMove() {
    isMoving = false;
    prevX = undefined;
    prevY = undefined;
  }

  function move(e: MouseEvent) {
    if (!isMoving) return;
    const dx = prevX ? e.clientX - prevX : 0;
    const dy = prevY ? e.clientY - prevY : 0;
    x += dx;
    y += dy;
    prevX = e.clientX;
    prevY = e.clientY;
  }
</script>

<svelte:window onmouseup={stopMove} onmousemove={move} />

<div
  class={["move-handle", isMoving && "grabbed"]}
  role="presentation"
  title="Drag to move player"
  onmousedown={startMove}
>
  <!-- svelte-ignore a11y_missing_attribute -->
  <img src={moveSrc} draggable="false" />
</div>
