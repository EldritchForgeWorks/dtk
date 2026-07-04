import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@eldritchforgeworks/dtk-types/exemplar': resolve(__dirname, '../../packages/types/src/exemplar/index.ts'),
      '@eldritchforgeworks/dtk-types/apis': resolve(__dirname, '../../packages/types/src/apis/index.ts'),
      '@eldritchforgeworks/dtk-types/codex': resolve(__dirname, '../../packages/types/src/codex/index.ts'),
      '@eldritchforgeworks/dtk-types/forma': resolve(__dirname, '../../packages/types/src/forma/index.ts'),
      '@eldritchforgeworks/dtk-types/modus': resolve(__dirname, '../../packages/types/src/modus/index.ts'),
      '@eldritchforgeworks/dtk-types/ritus': resolve(__dirname, '../../packages/types/src/ritus/index.ts'),
      '@eldritchforgeworks/dtk-types/sequence': resolve(__dirname, '../../packages/types/src/sequence/index.ts'),
      '@eldritchforgeworks/dtk-types': resolve(__dirname, '../../packages/types/src/index.ts'),
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
