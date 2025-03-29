<script lang="ts">
  type Props = {
    src: string;
    title: string;
  } & Record<string, unknown>;
  let { src, title, ...rest }: Props = $props();
</script>

<button class="icon-button" {title} {...rest}>
  <img {src} alt={title} />
</button>
