import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts', 'src/adapters/in-memory/**/*.ts'],
      exclude: ['src/adapters/foundry/**'],
      thresholds: { lines: 85 },
    },
  },
  resolve: {
    alias: {
      '@dtk/types': '/Users/jcmurray/projects/games/foundry/dtk/packages/types/src/index.ts',
      '@dtk/types/ritus': '/Users/jcmurray/projects/games/foundry/dtk/packages/types/src/ritus/index.ts',
      '@dtk/types/apis': '/Users/jcmurray/projects/games/foundry/dtk/packages/types/src/apis/index.ts',
    },
  },
})
