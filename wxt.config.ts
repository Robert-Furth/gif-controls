import { resolve } from "node:path";

import { defineConfig } from "wxt";

import { WASM_NAME } from "./webextension/lib/constants";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-svelte"],
  srcDir: "webextension",

  imports: false,

  manifest: ({ browser, manifestVersion }) => ({
    name: "Gif Controls",
    permissions:
      browser === "firefox" ? ["menus", "storage"] : ["contextMenus", "storage", "offscreen"],
    host_permissions: manifestVersion === 2 ? ["<all_urls>"] : undefined,
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'",
    },
  }),

  hooks: {
    // Add decoder WASM to public assets
    "build:publicAssets": (_wxt, files) => {
      files.push({
        absoluteSrc: resolve("./decoder/pkg/gif_controls_decoder_bg.wasm"),
        relativeDest: WASM_NAME,
      });
    },

    // Add decoder WASM to public paths
    "prepare:publicPaths": (_wxt, paths) => {
      paths.push(WASM_NAME);
    },
  },
});
