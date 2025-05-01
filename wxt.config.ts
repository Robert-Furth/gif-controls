import { resolve } from "node:path";

import { defineConfig } from "wxt";

import { DECODE_WORKER_PATH, WASM_NAME } from "./webextension/lib/constants";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-svelte"],
  srcDir: "webextension",

  imports: false,

  manifest: ({ browser }) => ({
    name: "Gif Controls",
    permissions: [browser === "firefox" ? "menus" : "contextMenus", "storage"],
    host_permissions: ["<all_urls>"],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'",
    },

    web_accessible_resources: [
      {
        matches: ["<all_urls>"],
        resources: [`/${WASM_NAME}`, DECODE_WORKER_PATH],
      },
    ],
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

  webExt: {
    startUrls: [
      // "https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif",
      "https://commons.wikimedia.org/wiki/File:A_weather_balloon_exploding.gif",
      "https://en.wikipedia.org/wiki/GIF",
      "https://commons.wikimedia.org/wiki/Category:GIF_file_format",
    ],
  },
});
