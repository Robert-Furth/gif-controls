import { browser, Browser, defineBackground } from "#imports";

import { isMessage, RightClickMessage } from "@/lib/messages";
import { menus } from "@/lib/polyfills";

function addControlsListener(info: Browser.contextMenus.OnClickData, tab?: Browser.tabs.Tab) {
  if (tab?.id === undefined || info.menuItemId !== "add-gif-controls") return;

  const message: RightClickMessage = {
    name: "right-click",
    // @ts-expect-error targetElementId is firefox-specific
    targetElementId: info.targetElementId as number,
  };

  void browser.tabs.sendMessage(tab.id, message);
}

export default defineBackground(() => {
  menus.onClicked.addListener(addControlsListener);

  browser.runtime.onInstalled.addListener(() => {
    menus.create({
      id: "add-gif-controls",
      title: "Add Controls",
      contexts: ["image"],
      targetUrlPatterns: ["*://*/*.gif", "*://*/*.gif?*", "file://*/*.gif"],
    });
  });

  browser.runtime.onMessage.addListener((message) => {
    if (isMessage(message) && message.name === "open-options") {
      void browser.runtime.openOptionsPage();
    }
  });
});
