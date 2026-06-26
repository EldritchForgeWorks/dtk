import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/adapters/foundry/**'],
      thresholds: { lines: 85, functions: 85 },
    },
  },
  resolve: {
    alias: {
      '@dtk/types': '/Users/jcmurray/projects/games/foundry/dtk/packages/types/src/index.ts',
    },
  },
})
