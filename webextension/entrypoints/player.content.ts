import "@/assets/player.css";

import { mount, unmount } from "svelte";
import { browser } from "wxt/browser";
import { ContentScriptContext, createShadowRootUi } from "wxt/client";
import { defineContentScript } from "wxt/sandbox";

import PlayerLoader from "@/components/PlayerLoader.svelte";
import { isMessage } from "@/lib/messages";
import { opts } from "@/lib/options";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main(ctx) {
    let rightClickTarget: EventTarget | null = null;
    if (!import.meta.env.FIREFOX) {
      ctx.addEventListener(document, "contextmenu", (evt) => {
        rightClickTarget = evt.target;
      });
    }

    browser.runtime.onMessage.addListener((message, sender) => {
      if (sender.id !== browser.runtime.id) return;
      if (!isMessage(message) || message.name !== "right-click") return;

      const imageElement =
        message.targetElementId !== undefined
          ? browser.menus.getTargetElement(message.targetElementId)
          : rightClickTarget;

      if (!(imageElement instanceof HTMLImageElement)) return;

      return createPlayer(ctx, imageElement, imageElement.currentSrc).then((ui) => ui.mount());
    });
  },
});

async function createPlayer(ctx: ContentScriptContext, target: HTMLElement, imgSrc: string) {
  function removeSelf(e?: Event) {
    e?.preventDefault();
    ui?.remove();
  }

  const observer = new MutationObserver((records) => {
    if (!ui) return;

    for (const record of records) {
      if (Array.from(record.removedNodes).includes(ui.shadowHost)) {
        ui.remove();
      }
    }
  });

  const { width, height } = target.getBoundingClientRect();
  const minWidth = await opts.minPlayerWidth.getValue();
  const minHeight = await opts.minPlayerHeight.getValue();

  let shouldRestoreDraggable = false;
  let originalHref: string | undefined = undefined;

  const ui = await createShadowRootUi(ctx, {
    name: "gif-viewer",
    position: "inline",
    anchor: target,

    append: (anchor, shadowHost) => {
      const style = window.getComputedStyle(anchor);

      if (shadowHost instanceof HTMLElement) {
        shadowHost.style.position = style.position;
        shadowHost.style.inset = style.inset;
        shadowHost.style.margin = style.margin;
        shadowHost.style.padding = style.padding;
        shadowHost.style.border = style.border;
        shadowHost.style.background = style.background;
        shadowHost.style.width = `${width}px`;
        shadowHost.style.height = `${height}px`;
        shadowHost.style.minWidth = `${minWidth}px`;
        shadowHost.style.minHeight = `${minHeight}px`;
        shadowHost.style.display = style.display === "inline" ? "inline-block" : style.display;
        shadowHost.style.boxSizing = "border-box";
      }

      const parent = anchor.parentElement;
      if (parent !== null) {
        if (parent.draggable) {
          parent.draggable = false;
          shouldRestoreDraggable = true;
        }

        if (parent.nodeName === "A") {
          originalHref = (parent as HTMLAnchorElement).href;
          (parent as HTMLAnchorElement).href = "javascript:void(0)";
        }
      }

      anchor.replaceWith(shadowHost);
      observer.observe(document.body, { childList: true, subtree: true });
    },

    onMount: (container) => {
      const app = mount(PlayerLoader, {
        target: container,
        props: {
          source: imgSrc,
          unmount: removeSelf,
          defaultWidth: width,
          defaultHeight: height,
        },
      });
      return app;
    },

    onRemove: (app) => {
      if (app === undefined) {
        throw new Error("Cannot unmount svelte component since it is undefined!");
      }
      unmount(app);
      observer.disconnect();
      ui.shadowHost.replaceWith(target);

      if (target.parentElement) {
        if (shouldRestoreDraggable) {
          target.parentElement.draggable = true;
        }
        if (originalHref !== undefined) {
          target.parentElement.setAttribute("href", originalHref);
        }
      }
    },
  });

  return ui;
}
