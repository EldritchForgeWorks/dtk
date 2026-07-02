#!/usr/bin/env node
// package-module.mjs — stage and zip one DTK module's release artifacts.
//
// Usage:
//   node scripts/package-module.mjs <module-id> [version]
//   node scripts/package-module.mjs <module-id> --print-dir
//
// Given a module id, locates its directory (`module/` for `dtk`, else
// `packages/<name>/`), stamps `version` / `url` / `manifest` / `download`
// into a STAGED copy of module.json (the checked-in file is never touched),
// stages module.json + dist/ + templates/ + styles/ + packs/ + lang/
// (whichever exist), validates that every path declared in the manifest
// (esmodules, styles, packs[].path) exists in the staged tree, and zips the
// staged contents at the archive root (no wrapping directory).
//
// Outputs:
//   .release/<module-id>/           staged tree (module.json at root)
//   .release/<module-id>.zip        release asset 1
//   .release/<module-id>/module.json  release asset 2 (upload this path;
//                                     the asset name is the basename)
//
// Dependency-free (Node 20+). Zipping shells out to the system `zip`
// binary (present on ubuntu-latest runners and macOS).

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_URL = 'https://github.com/EldritchForgeWorks/dtk';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Module id → directory (relative to repo root). Single source of truth. */
const MODULES = {
  'dtk': 'module',
  'dtk-alea': 'packages/alea',
  'dtk-lex': 'packages/lex',
  'dtk-systema': 'packages/systema',
  'dtk-opus': 'packages/opus',
  'dtk-fascia': 'packages/fascia',
  'dtk-promptuarium': 'packages/promptuarium',
  'dtk-shadowrun': 'packages/shadowrun',
};

/** Directories staged into the zip when present in the module directory. */
const INCLUDE_DIRS = ['dist', 'templates', 'styles', 'packs', 'lang'];

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function fail(msg) {
  console.error(`package-module: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const moduleId = args[0];
if (!moduleId) fail(`usage: package-module.mjs <module-id> [version|--print-dir]`);

const moduleDirRel = MODULES[moduleId];
if (!moduleDirRel) {
  fail(`unknown module id '${moduleId}'. Known ids: ${Object.keys(MODULES).join(', ')}`);
}

if (args.includes('--print-dir')) {
  console.log(moduleDirRel);
  process.exit(0);
}

const moduleDir = join(ROOT, moduleDirRel);
const manifestPath = join(moduleDir, 'module.json');
if (!existsSync(manifestPath)) fail(`missing ${manifestPath}`);

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const version = args[1] ?? manifest.version;
if (!SEMVER_RE.test(version)) fail(`'${version}' is not a valid semver version`);

// --- Stamp release fields (into the staged copy only) ---------------------
manifest.version = version;
manifest.url = REPO_URL;
manifest.manifest = `${REPO_URL}/releases/download/${moduleId}-latest/module.json`;
manifest.download = `${REPO_URL}/releases/download/${moduleId}-v${version}/${moduleId}.zip`;

// --- Stage ------------------------------------------------------------------
const releaseDir = join(ROOT, '.release');
const stageDir = join(releaseDir, moduleId);
const zipPath = join(releaseDir, `${moduleId}.zip`);

rmSync(stageDir, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(stageDir, { recursive: true });

writeFileSync(join(stageDir, 'module.json'), JSON.stringify(manifest, null, 2) + '\n');

const distDir = join(moduleDir, 'dist');
if (!existsSync(distDir)) {
  fail(`${moduleDirRel}/dist does not exist — build the module first (npm run build)`);
}

const staged = ['module.json'];
for (const dir of INCLUDE_DIRS) {
  const src = join(moduleDir, dir);
  if (!existsSync(src)) continue;
  cpSync(src, join(stageDir, dir), { recursive: true });
  staged.push(`${dir}/`);
}

// --- Validate declared manifest paths exist in the staged tree --------------
const declared = [
  ...(manifest.esmodules ?? []),
  ...(manifest.styles ?? []),
  ...(manifest.packs ?? []).map((p) => p.path),
];
const missing = declared.filter((p) => !existsSync(join(stageDir, p)));
if (missing.length > 0) {
  fail(`manifest for ${moduleId} declares paths missing from the staged zip: ${missing.join(', ')}`);
}

// --- Zip (contents at archive root, no wrapping directory) ------------------
execFileSync('zip', ['-r', '-X', '-q', zipPath, '.', '-x', '*.DS_Store'], {
  cwd: stageDir,
  stdio: 'inherit',
});

console.log(`Staged   : ${staged.join(' ')}`);
console.log(`Version  : ${version}`);
console.log(`Manifest : ${manifest.manifest}`);
console.log(`Download : ${manifest.download}`);
console.log(`Assets   : .release/${moduleId}.zip  .release/${moduleId}/module.json`);
