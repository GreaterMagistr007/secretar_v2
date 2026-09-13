import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** Конфигурация Svelte: препроцессор для TypeScript в блоках <script lang="ts">. */
export default {
  preprocess: vitePreprocess(),
};
