import { browser, Menus, Tabs } from "wxt/browser";
import { defineBackground } from "wxt/sandbox";

import { RightClickMessage } from "@/lib/messages";

const menus = import.meta.env.FIREFOX ? browser.menus : browser.contextMenus;
const action = browser.action ?? browser.browserAction;

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
