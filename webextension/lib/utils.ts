import { browser } from "#imports";

type Menus = typeof browser.contextMenus & {
  getTargetElement: (_: number) => HTMLElement;
};

export const menus = (
  import.meta.env.FIREFOX
    ? // @ts-expect-error browser.menus is firefox-specific
      browser.menus
    : browser.contextMenus
) as Menus;

function targetHasDefault(e: Event): boolean {
  if (e.target === null || !(e.target instanceof HTMLElement)) return false;

  // Tab navigation
  if (e instanceof KeyboardEvent && e.key === "Tab") return true;

  if (e.type === "click") {
    if (["A", "LABEL"].includes(e.target.nodeName)) return true;
    if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") return true;
    return false;
  }

  if (e instanceof KeyboardEvent) {
    if (["SELECT", "INPUT"].includes(e.target.nodeName)) return true;
    if (e.target.nodeName === "BUTTON" && e.key === " ") return true;
    return false;
  }

  return false;
}

/** Stops an event from propagating, and only allows default behavior if the event target has
 * default behavior. */
export function swallowEvents(e: Event) {
  e.stopPropagation();

  if (!targetHasDefault(e)) {
    e.preventDefault();
  }
}

export function createBlobUrl(ui8a: Uint8Array): string {
  const blob = new Blob([ui8a], { type: "application/octet-stream" });
  return URL.createObjectURL(blob);
}
