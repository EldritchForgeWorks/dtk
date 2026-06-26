import { defineConfig, Plugin } from 'vite'
import { resolve } from 'path'
import { existsSync } from 'fs'

/**
 * Treat imports of `.js` files that resolve only to a `.d.ts` declaration as
 * empty virtual modules.  These files are type-only (no runtime code) and
 * Vite/Rollup cannot bundle them.
 */
function typeOnlyDeclarationPlugin(): Plugin {
  return {
    name: 'type-only-declaration',
    resolveId(id, importer) {
      // Only act on relative imports that end in .js
      if (!importer || !id.startsWith('.') || !id.endsWith('.js')) return null
      const dir = resolve(importer, '..')
      const base = id.slice(0, -3) // strip .js
      const tsPath = resolve(dir, base + '.ts')
      const dtsPath = resolve(dir, base + '.d.ts')
      // If there's a real .ts source, let Vite resolve it normally
      if (existsSync(tsPath)) return null
      // If there's only a .d.ts, return a virtual empty module
      if (existsSync(dtsPath)) return '\0virtual:type-only:' + id
      return null
    },
    load(id) {
      if (id.startsWith('\0virtual:type-only:')) return 'export {}'
    },
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@dtk/types': resolve(__dirname, '../packages/types/src/index.ts'),
    },
  },
  plugins: [typeOnlyDeclarationPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'dtk.js',
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    rollupOptions: {
      // Foundry globals (game, Hooks, canvas, etc.) are runtime globals, not imports
    },
  },
})
