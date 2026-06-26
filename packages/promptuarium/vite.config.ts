import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@dtk/types': resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'dtk-promptuarium.js',
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    rollupOptions: {
      // Foundry globals (game, Hooks, canvas, etc.) are runtime globals, not imports
      // node built-ins used by the CLI are external to the Foundry bundle
      external: ['fs', 'path', 'url', 'crypto', 'stream', 'util', 'os', 'events'],
    },
  },
})
