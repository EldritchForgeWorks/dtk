import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@eldritchforgeworks/dtk-types': resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/adapters/foundry/**', 'src/adapters/in-memory/**'],
      thresholds: { lines: 85, functions: 85 },
    },
  },
})
