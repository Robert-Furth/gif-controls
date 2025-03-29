import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import svelte from "eslint-plugin-svelte";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  globalIgnores(["decoder/", ".output/", ".wxt/"]),

  // { files: ["**/*.{js,mjs,cjs,ts}"], languageOptions: { globals: globals.browser } },
  { files: ["**/*.{js,mjs,cjs,ts}"], plugins: { js }, extends: ["js/recommended"] },
  tseslint.configs.recommended,
  svelte.configs.recommended,
  svelte.configs.prettier,
  eslintConfigPrettier,
  {
    files: ["**/*.{svelte,svelte.js,svelte.ts}"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        extraFileExtensions: [".svelte"],
      },
    },
  },
]);
