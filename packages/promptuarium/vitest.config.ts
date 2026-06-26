import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@dtk/types/exemplar': resolve(__dirname, '../../packages/types/src/exemplar/index.ts'),
      '@dtk/types/apis': resolve(__dirname, '../../packages/types/src/apis/index.ts'),
      '@dtk/types/codex': resolve(__dirname, '../../packages/types/src/codex/index.ts'),
      '@dtk/types/forma': resolve(__dirname, '../../packages/types/src/forma/index.ts'),
      '@dtk/types/modus': resolve(__dirname, '../../packages/types/src/modus/index.ts'),
      '@dtk/types/ritus': resolve(__dirname, '../../packages/types/src/ritus/index.ts'),
      '@dtk/types': resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/adapters/node/**', 'src/adapters/in-memory/**'],
      thresholds: { lines: 85, functions: 85 },
    },
  },
})
