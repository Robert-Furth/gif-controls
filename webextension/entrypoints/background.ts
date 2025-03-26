import { browser, Menus, Tabs } from "wxt/browser";
import { defineBackground } from "wxt/sandbox";

import { RightClickMessage } from "@/utils/messages";

const menus = import.meta.env.FIREFOX ? browser.menus : browser.contextMenus;

function addControlsListener(info: Menus.OnClickData, tab?: Tabs.Tab) {
  if (tab?.id === undefined || info.menuItemId !== "add-gif-controls") return;

  const message: RightClickMessage = {
    name: "right-click",
    targetElementId: info.targetElementId, // undefined for chrome
  };

  browser.tabs.sendMessage(tab.id, message);
}

export default defineBackground(() => {
  menus.onClicked.addListener(addControlsListener);

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
