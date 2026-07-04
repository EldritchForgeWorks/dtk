import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Structural-guarantee tests for publish-alea-domain (openspec change,
// tasks 4.1/4.2): the published npm surface (src/domain/**, src/ports/**,
// src/adapters/in-memory/**, src/AleaApi.ts) must never transitively import
// anything under src/adapters/foundry/**. Unlike scripts/verify-dist-exclusions.mjs
// (which checks the *built* dist/ output and runs as a postbuild hook), this
// test checks *source* and runs as part of the normal `npm test` — no build
// required, so it catches a stray import the moment it's written.

const packageRoot = resolve(__dirname, '../../..');
const srcRoot = join(packageRoot, 'src');

const PUBLISHED_SURFACE_DIRS = [
  join(srcRoot, 'domain'),
  join(srcRoot, 'ports'),
  join(srcRoot, 'adapters', 'in-memory'),
];
const PUBLISHED_SURFACE_FILES = [join(srcRoot, 'AleaApi.ts')];

function listTsFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      listTsFiles(full, out);
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
}

function collectPublishedSurfaceFiles(): string[] {
  const files: string[] = [...PUBLISHED_SURFACE_FILES];
  for (const dir of PUBLISHED_SURFACE_DIRS) {
    listTsFiles(dir, files);
  }
  return files;
}

describe('published surface never imports src/adapters/foundry (task 4.2)', () => {
  it('src/domain, src/ports, src/adapters/in-memory, and src/AleaApi.ts contain no reference to adapters/foundry', () => {
    const files = collectPublishedSurfaceFiles();
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      if (/adapters\/foundry/.test(content)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('src/adapters/foundry/ itself is excluded from tsconfig.build.json include and named in exclude', () => {
    const buildConfig = JSON.parse(
      readFileSync(join(packageRoot, 'tsconfig.build.json'), 'utf-8'),
    ) as { include?: string[]; exclude?: string[] };

    const include = buildConfig.include ?? [];
    const exclude = buildConfig.exclude ?? [];

    expect(include.some((p) => p.includes('adapters/foundry'))).toBe(false);
    expect(include.some((p) => p === 'src/index.ts')).toBe(false);
    expect(exclude).toContain('src/adapters/foundry/**');
    expect(exclude).toContain('src/index.ts');
  });
});

// Guard for task 4.1 (dist/ structural check) — runs the same assertions as
// scripts/verify-dist-exclusions.mjs, but only if dist/ already exists (i.e.
// `npm run build` has run in this checkout). This lets `npm test` alone
// (pre-build, e.g. in a fresh clone) stay green while still exercising the
// dist-shape guarantee whenever a build artifact is present, as a second
// line of defense alongside the postbuild script.
describe('dist/ build output excludes Foundry adapters (task 4.1, opportunistic)', () => {
  const distDir = join(packageRoot, 'dist');

  it.skipIf(!existsSync(distDir))('dist/adapters/foundry/ does not exist and no tsc-built dist/index.js is present', () => {
    const foundryDistDir = join(distDir, 'adapters', 'foundry');
    expect(existsSync(foundryDistDir)).toBe(false);

    for (const name of ['index.js', 'index.d.ts']) {
      const candidate = join(distDir, name);
      expect(existsSync(candidate) && statSync(candidate).isFile()).toBe(false);
    }
  });
});
