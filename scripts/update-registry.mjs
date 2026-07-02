#!/usr/bin/env node
// update-registry.mjs — update one module's entry in registry.json after a release.
//
// Usage: node scripts/update-registry.mjs <module-id> <version>
//
// Sets `latestVersion` to <version> and (re)normalizes `manifestUrl` to the
// module's stable moving-release URL. Fails if the module id has no entry —
// registry entries (id, name, tier, description, dependencies) are authored
// in registry.json; only the release-derived fields are machine-updated.
//
// Dependency-free (Node 20+).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_URL = 'https://github.com/EldritchForgeWorks/dtk';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = join(ROOT, 'registry.json');
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const [moduleId, version] = process.argv.slice(2);
if (!moduleId || !version) {
  console.error('usage: update-registry.mjs <module-id> <version>');
  process.exit(1);
}
if (!SEMVER_RE.test(version)) {
  console.error(`update-registry: '${version}' is not a valid semver version`);
  process.exit(1);
}

const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
const entry = (registry.modules ?? []).find((m) => m.id === moduleId);
if (!entry) {
  console.error(`update-registry: no registry entry for '${moduleId}' in registry.json`);
  process.exit(1);
}

entry.latestVersion = version;
entry.manifestUrl = `${REPO_URL}/releases/download/${moduleId}-latest/module.json`;

writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
console.log(`registry.json: ${moduleId} → latestVersion ${version}`);
