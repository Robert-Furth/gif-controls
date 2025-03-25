import { browser } from "wxt/browser";
import { defineBackground } from "wxt/sandbox";

export type RightClickMessage = {
  name: "right-click";
  targetElementId?: number;
};

const menus = import.meta.env.FIREFOX ? browser.menus : browser.contextMenus;

export default defineBackground(() => {
  menus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id || info.menuItemId !== "add-gif-controls") return;

    const message: RightClickMessage = { name: "right-click", targetElementId: undefined };
    if (import.meta.env.FIREFOX) {
      message.targetElementId = info.targetElementId;
    }

    browser.tabs.sendMessage(tab.id, message);
  });

  browser.runtime.onInstalled.addListener(() => {
    menus.create({
      id: "add-gif-controls",
      title: "Add Controls",
      contexts: ["image"],
      // contexts: ["all"],
      targetUrlPatterns: ["*://*/*.gif", "*://*/*.gif?*"],
    });
  });
});
