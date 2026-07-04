#!/usr/bin/env node
// Structural exclusion guard for the tsc build (publish-alea-domain).
//
// Runs automatically as the "postbuild" npm lifecycle script, i.e. after
// "vite build && tsc --project tsconfig.build.json". Fails the build if the
// tsc-built npm-package surface (dist/domain, dist/ports,
// dist/adapters/in-memory, dist/AleaApi.*) has structurally leaked the
// Foundry-only surface (dist/adapters/foundry/** or a tsc-built
// dist/index.js from the Foundry module entry point).
//
// Defense in depth beyond the tsconfig.build.json `exclude` list — proves
// the exclusion held for THIS build's actual output, not just the config.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(fileURLToPath(import.meta.url), '../..');
const distDir = join(packageRoot, 'dist');

/** @type {string[]} */
const failures = [];

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
}

if (!existsSync(distDir)) {
  console.error(`verify-dist-exclusions: dist/ does not exist at ${distDir} — did the build run?`);
  process.exit(1);
}

// 1. No dist/adapters/foundry/** of any kind.
const foundryDistDir = join(distDir, 'adapters', 'foundry');
if (existsSync(foundryDistDir)) {
  failures.push(`dist/adapters/foundry/ exists (${foundryDistDir}) — the Foundry adapter surface must never be emitted by the tsc build.`);
}

// 2. No index.js/.d.ts at the tsc-build root (that would be the Foundry
//    module entry point, src/index.ts, leaking into the npm package build).
for (const name of ['index.js', 'index.d.ts', 'index.js.map', 'index.d.ts.map']) {
  const candidate = join(distDir, name);
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    failures.push(`dist/${name} exists — src/index.ts (the Foundry module entry) must not be emitted by the tsc build.`);
  }
}

// 3. Belt-and-braces: walk the whole dist/ tree and reject any path
//    segment literally named "foundry" outside the known Vite bundle file
//    (dist/dtk-alea.js — the unchanged Foundry module bundle, which is
//    expected and out of scope for this check).
const allFiles = [];
walk(distDir, allFiles);
for (const file of allFiles) {
  const rel = file.slice(distDir.length + 1);
  if (rel === 'dtk-alea.js' || rel === 'dtk-alea.js.map') continue; // the Vite Foundry-module bundle — expected, unrelated to the tsc build
  if (/(^|[\\/])foundry([\\/]|$)/.test(rel)) {
    failures.push(`dist/${rel} — unexpected "foundry" path segment in tsc build output.`);
  }
}

if (failures.length > 0) {
  console.error('verify-dist-exclusions: FAILED');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`verify-dist-exclusions: OK — no dist/adapters/foundry/, no tsc-built dist/index.js (checked ${allFiles.length} files under dist/).`);
