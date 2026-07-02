import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@eldritchforgeworks/dtk-types': resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'dtk-systema.js',
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    rollupOptions: {
      // Foundry globals (game, Hooks, canvas, etc.) are runtime globals, not imports
    },
  },
})
