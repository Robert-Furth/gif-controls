import "@/assets/player.css";

import { mount, unmount } from "svelte";
import { browser } from "wxt/browser";
import { ContentScriptContext, createShadowRootUi } from "wxt/client";
import { defineContentScript } from "wxt/sandbox";

import PlayerLoader from "@/components/PlayerLoader.svelte";
import { isMessage } from "@/lib/messages";

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

      return createPlayer(ctx, imageElement, imageElement.src).then((ui) => ui.mount());
    });
  },
});

async function createPlayer(ctx: ContentScriptContext, target: HTMLElement, imgSrc: string) {
  function removeSelf() {
    ui?.remove();
  }

  const { width, height } = target.getBoundingClientRect();

  let shouldRestoreDraggable = false;

  const ui = await createShadowRootUi(ctx, {
    name: "gif-viewer",
    position: "inline",
    anchor: target,

    isolateEvents: true,

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
        shadowHost.style.minHeight = "60px";
        shadowHost.style.display = style.display === "inline" ? "inline-block" : style.display;
        shadowHost.style.boxSizing = "border-box";
      }

      if (anchor.parentElement?.nodeName === "A" && anchor.parentElement.draggable) {
        anchor.parentElement.draggable = false;
        shouldRestoreDraggable = true;
      }

      anchor.replaceWith(shadowHost);
    },

    onMount: (container) => {
      const app = mount(PlayerLoader, {
        target: container,
        props: {
          source: imgSrc,
          unmount: removeSelf,
        },
      });
      return app;
    },

    onRemove: (app) => {
      if (app === undefined) {
        throw new Error("Cannot unmount svelte component since it is undefined!");
      }
      unmount(app);
      ui.shadowHost.replaceWith(target);

      if (shouldRestoreDraggable && target.parentElement) {
        target.parentElement.draggable = true;
      }
    },
  });

  return ui;
}
