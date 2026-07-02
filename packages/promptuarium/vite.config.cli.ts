import { defineConfig } from 'vite'
import { resolve } from 'path'

// CLI build — emits dist/cli/index.js (the `promptuarium` bin).
//
// @eldritchforgeworks/dtk-types is aliased to its TypeScript source and BUNDLED (along with zod
// and commander), so the published package has no runtime dependency on
// @eldritchforgeworks/dtk-types and the tarball is self-contained.
// Only node built-ins and the native/runtime deps (classic-level, js-yaml)
// stay external — those are declared in "dependencies".
//
// Subpath aliases MUST precede the bare '@eldritchforgeworks/dtk-types' alias (prefix matching).
const typesSrc = (p: string) => resolve(__dirname, `../../packages/types/src/${p}`)

export default defineConfig({
  resolve: {
    alias: {
      '@eldritchforgeworks/dtk-types/exemplar': typesSrc('exemplar/index.ts'),
      '@eldritchforgeworks/dtk-types/apis': typesSrc('apis/index.ts'),
      '@eldritchforgeworks/dtk-types/codex': typesSrc('codex/index.ts'),
      '@eldritchforgeworks/dtk-types/forma': typesSrc('forma/index.ts'),
      '@eldritchforgeworks/dtk-types/modus': typesSrc('modus/index.ts'),
      '@eldritchforgeworks/dtk-types/ritus': typesSrc('ritus/index.ts'),
      '@eldritchforgeworks/dtk-types/sequence': typesSrc('sequence/index.ts'),
      '@eldritchforgeworks/dtk-types/codex-entry': typesSrc('codex-entry/index.ts'),
      '@eldritchforgeworks/dtk-types': typesSrc('index.ts'),
    },
  },
  build: {
    target: 'node20',
    outDir: 'dist/cli',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/cli/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [/^node:/, 'classic-level', 'js-yaml'],
      output: {
        banner: '#!/usr/bin/env node',
      },
    },
  },
})
