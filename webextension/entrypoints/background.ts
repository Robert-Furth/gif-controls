import { browser, defineBackground } from "#imports";

import { OFFSCREEN_PAGE_PATH } from "@/lib/constants";
import { decode } from "@/lib/gif";
import { isMessage, Message } from "@/lib/messages";
import { menus } from "@/lib/utils";

// https://developer.chrome.com/docs/extensions/reference/api/offscreen#maintain_the_lifecycle_of_an_offscreen_document
let creating: Promise<void> | undefined;
async function ensureOffscreenPage() {
  const url = browser.runtime.getURL(OFFSCREEN_PAGE_PATH);
  const existing = await browser.runtime.getContexts({
    contextTypes: [browser.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [url],
  });

  if (existing.length > 0) return;
  if (creating !== undefined) {
    await creating;
  } else {
    creating = browser.offscreen.createDocument({
      url: url,
      reasons: ["BLOBS"],
      justification: "Decode GIFs in the background",
    });
    await creating;
    creating = undefined;
  }
}

export default defineBackground(() => {
  // Create menu item
  menus.create({
    id: "add-gif-controls",
    title: "Add Controls",
    contexts: ["image"],
    targetUrlPatterns: ["*://*/*.gif", "*://*/*.gif?*", "file://*/*.gif"],
  });

  // Clicking the menu item adds the controls
  menus.onClicked.addListener((info, tab) => {
    if (tab?.id === undefined || info.menuItemId !== "add-gif-controls") return;

    const message: Message = {
      name: "right-click",
      // @ts-expect-error targetElementId is firefox-specific
      targetElementId: info.targetElementId as number,
    };
    void browser.tabs.sendMessage(tab.id, message);
  });

  // "open-options" message (common to all browsers)
  browser.runtime.onMessage.addListener((message) => {
    if (!isMessage(message) || message.name !== "open-options") return;
    void browser.runtime.openOptionsPage();
  });

  // "decode-request-ui8a" message (FF-only because only it can handle `Uint8Array`s in messages)
  if (import.meta.env.FIREFOX) {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!isMessage(message) || message.name !== "decode-request-ui8a") return;

      decode(message.content, message.wasm_path)
        .then((gif) => sendResponse({ name: "decode-response-ui8a", gif } satisfies Message))
        .catch((e) =>
          sendResponse({ name: "decode-response-error", error: `${e}` } satisfies Message),
        );
      return true;
    });
  }

  // "decode-request-blob-url" message (relies on chrome's offscreen document functionality)
  if (import.meta.env.CHROME) {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (
        !isMessage(message) ||
        message.name !== "decode-request-blob-url" ||
        message.target !== "background"
      )
        return;

      ensureOffscreenPage()
        .then(() =>
          browser.runtime.sendMessage({ ...message, target: "offscreen" } satisfies Message),
        )
        .then(sendResponse)
        .catch((e) =>
          sendResponse({ name: "decode-response-error", error: `${e}` } satisfies Message),
        );
      return true;
    });
  }
});
