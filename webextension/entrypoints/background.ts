import { defineBackground } from "#imports";
import { browser, Browser } from "wxt/browser";

import { RightClickMessage } from "@/lib/messages";

// @ts-expect-error browser.menus is firefox-specific
const menus = import.meta.env.FIREFOX ? browser.menus : browser.contextMenus;
const action = browser.action ?? browser.browserAction;

function addControlsListener(info: Browser.contextMenus.OnClickData, tab?: Browser.tabs.Tab) {
  if (tab?.id === undefined || info.menuItemId !== "add-gif-controls") return;

  const message: RightClickMessage = {
    name: "right-click",
    // @ts-expect-error targetElementId is firefox-specific
    targetElementId: info.targetElementId,
  };

  browser.tabs.sendMessage(tab.id, message);
}

export default defineBackground(() => {
  menus.onClicked.addListener(addControlsListener);

  action.onClicked.addListener(() => browser.runtime.openOptionsPage());

  browser.runtime.onInstalled.addListener(() => {
    menus.create({
      id: "add-gif-controls",
      title: "Add Controls",
      contexts: ["image"],
      targetUrlPatterns: ["*://*/*.gif", "*://*/*.gif?*", "file://*/*.gif"],
    });
  });
});
