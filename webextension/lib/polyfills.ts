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

export const action = browser.action ?? browser.browserAction;
