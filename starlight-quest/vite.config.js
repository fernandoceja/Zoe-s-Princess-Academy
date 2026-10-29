import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));

// Engine modules are imported with a cache stamp (e.g. '../js/quests.js?v=20261028r3').
// Vite would treat the stamped and unstamped specifiers as two modules, so the engine
// would load twice. Strip the stamp so every import resolves to one file.
const stripStamp = {
  name: 'strip-v-stamp', enforce: 'pre',
  resolveId(source, importer) {
    if (!importer || !source.startsWith('.') || !/\?v=[\w.-]+$/.test(source)) return null;
    return resolve(dirname(importer.split('?')[0]), source.replace(/\?v=[\w.-]+$/, ''));
  },
};

export default defineConfig({
  root: here,
  base: './',
  plugins: [stripStamp, react()],
  resolve: {
    alias: { three: resolve(here, 'vendor/three.module.js') },
  },
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'app',
    rollupOptions: {
      input: { index: resolve(here, 'index.html') },
    },
  },
});
