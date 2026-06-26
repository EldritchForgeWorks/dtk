import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Exclude barrel re-export files and pure TypeScript interface files.
      // Barrel index.ts files contain only re-exports which produce no
      // meaningful JS to measure. API interface files (alea-api, hub-api, etc.)
      // contain only TypeScript interface/type declarations that compile to
      // empty JS modules — there is no executable code to cover.
      exclude: [
        'src/index.ts',
        'src/*/index.ts',
        'src/apis/alea-api.ts',
        'src/apis/hub-api.ts',
        'src/apis/lex-api.ts',
        'src/apis/opus-api.ts',
        'src/apis/promptuarium-api.ts',
        'src/apis/systema-api.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
