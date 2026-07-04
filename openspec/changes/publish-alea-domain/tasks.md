## 1. Package metadata

- [x] 1.1 Remove `"private": true` from `packages/alea/package.json`
- [x] 1.2 Add `engines: { node: ">=20" }`, `license: "MIT"`, `repository`
      (`git+https://github.com/EldritchForgeWorks/dtk.git`, directory
      `packages/alea`), `homepage`
      (`https://github.com/EldritchForgeWorks/dtk#readme`), `publishConfig:
      { access: "public", registry: "https://registry.npmjs.org/" }`,
      `files: ["dist"]` — mirror `packages/types/package.json` exactly
- [x] 1.3 Add `packages/alea/.npmrc` with
      `@eldritchforgeworks:registry=https://registry.npmjs.org/` (copy
      `packages/types/.npmrc`)

## 2. Parallel tsc build target [impl]

- [x] 2.1 Add `packages/alea/tsconfig.build.json`: extends `./tsconfig.json`,
      `rootDir: ./src`, `declaration: true`, `declarationMap: true`,
      `outDir: ./dist` — `include` covers `src/domain/**`, `src/ports/**`,
      `src/adapters/in-memory/**`, `src/AleaApi.ts`; `exclude` explicitly
      lists `src/index.ts` and `src/adapters/foundry/**` (do not rely on
      absence from `include` alone — state the exclusion explicitly so it
      survives future `include` glob edits)
- [x] 2.2 Update `packages/alea/package.json` `build` script to
      `"vite build && tsc --project tsconfig.build.json"` — the existing
      Vite/Foundry-module build must run unmodified; the tsc build is
      additive
- [x] 2.3 Confirm `tsc --project tsconfig.build.json` emits `dist/**/*.js` +
      `dist/**/*.d.ts` for domain/ports/in-memory-adapters/AleaApi only, and
      does NOT emit anything under `dist/adapters/foundry/`
      — verified: `find dist -type f` after `npm run build` lists only
      `dist/AleaApi.{js,d.ts}`, `dist/domain/**`, `dist/ports/**`,
      `dist/adapters/in-memory/**`, plus the unchanged
      `dist/dtk-alea.js`(.map) Vite bundle. No `dist/adapters/foundry/`,
      no `dist/index.js`.

## 3. Exports map [impl]

- [x] 3.1 Add `exports` map to `packages/alea/package.json`:
      `.` → `AleaApi` facade + top-level barrel, `./domain` → entities +
      services + value-objects, `./ports` → the five port interfaces,
      `./adapters/in-memory` → the five test doubles — each with `types`
      + `import` conditions pointing at the tsc-built `.d.ts`/`.js` pairs
- [x] 3.2 Add/verify barrel `index.ts` files exist for `src/domain/`,
      `src/ports/`, `src/adapters/in-memory/` (one barrel per exported
      subpath, matching the `@eldritchforgeworks/dtk-types` per-contract
      barrel pattern) so each `exports` entry has a single stable entry
      file to point at
      — created all three (none existed before this change);
      `src/AleaApi.ts` additionally re-exports `RollContext`,
      `SequenceExemplar`, `Ritus` so the `.` export is self-contained.
- [x] 3.3 [test] `npm pack --dry-run` in `packages/alea` — assert the file
      list contains ONLY `dist/**` (no `src/adapters/foundry/**`, no
      `src/index.ts`-derived output, no `templates/`, no `tests/`) and
      `package.json`
      — verified manually: 75 files, all under `dist/**`, plus
      `package.json`. Tarball 39.4 kB / unpacked 174.0 kB.

## 4. Exclude Foundry adapters — structural guarantee [test]

- [x] 4.1 [test] Add a build-time or CI check that fails if any file under
      `dist/adapters/foundry/` exists after `npm run build` (defense in
      depth beyond the tsconfig `exclude` — e.g. a short script asserting
      the directory is absent, run as part of `npm run build` or a
      pretest hook)
      — `scripts/verify-dist-exclusions.mjs`, wired as the npm
      `postbuild` lifecycle script (runs automatically after
      `vite build && tsc --project tsconfig.build.json`). Also walks all
      of `dist/` rejecting any `foundry` path segment outside the known
      `dist/dtk-alea.js` Vite bundle, and checks for a tsc-built
      `dist/index.js`.
- [x] 4.2 [test] Add an explicit unit/lint assertion (or `grep`-based CI
      step) that no file reachable via the package's `exports` map
      transitively imports anything under `src/adapters/foundry/`
      — `tests/unit/build/dist-exclusions.test.ts` (vitest, runs as part
      of `npm test`, no build required): greps `src/domain/**`,
      `src/ports/**`, `src/adapters/in-memory/**`, `src/AleaApi.ts` for
      the substring `adapters/foundry` (none found) and asserts
      `tsconfig.build.json`'s `include`/`exclude` lists match the
      required shape. Also contains an opportunistic dist/-shape
      assertion (skipped if `dist/` doesn't exist yet) mirroring
      `verify-dist-exclusions.mjs`.

## 5. Node-clean smoke test [smoke]

- [x] 5.1 [smoke] Write a plain Node.js script (no Foundry globals defined,
      no `jsdom`/Foundry shim) that imports `SequenceExecutor` and the five
      in-memory adapters from the built package (via `dist/`, or the packed
      tarball installed into a scratch project), composes them, executes a
      fixture `dtk.sequence` exemplar (reuse or adapt an existing fixture
      from `tests/fixtures/exemplar.ts`), and asserts on the emitted
      `dtk-alea.step` / `dtk-alea.await` / `dtk-alea.complete` events via
      `SpyHookEmitter`
      — `scripts/smoke-node-clean.mjs`. Imports from the built
      `dist/domain/index.js` + `dist/adapters/in-memory/index.js` (the
      actual `exports`-map targets, not `src/`). Fixture: 1 rule step
      (`attack`, pool `2`) + 1 await step (`decision`, choices
      `['dodge','tank']`); executes, asserts the `dtk-alea.step` /
      `dtk-alea.await` payload shapes and suspension, then resumes and
      asserts the resulting `dtk-alea.complete` payload
      (`stepOutputs['decision.choice'] === 'dodge'`).
- [x] 5.2 [smoke] Run the script in a subprocess with no `game`/`Hooks`
      globals defined and confirm it exits 0 with no `ReferenceError` —
      this is the acceptance bar: a domain surface that accidentally pulls
      in a Foundry-adapter transitive import must fail this check, not
      Officina's build
      — `node scripts/smoke-node-clean.mjs` run standalone (plain `node`,
      no globals shimmed). Result: exit 0, `SMOKE OK` printed, all
      assertions passed. Wired as `npm run test:smoke` for discoverability
      (not part of `npm test`/vitest, since it must run in a real clean
      subprocess after `npm run build`).

## 6. Verify existing build/tests still green

- [x] 6.1 Run `vite build` in `packages/alea` and confirm `dist/dtk-alea.js`
      is produced unchanged (Foundry module build untouched)
      — verified byte-for-byte: SHA-256 of `dist/dtk-alea.js` built from
      this change's tree (`6740ef28...`) is identical to a build from the
      pre-change committed source (`git stash` of the `package.json` /
      `AleaApi.ts` edits, rebuild, re-hash, `git stash pop`). The only
      source edit in the Vite build's dependency graph (`AleaApi.ts`) is
      type-only (`export type {...}`), erased at compile time.
- [x] 6.2 Run the existing Vitest suite (`npm test` /
      `npm run test:coverage`) and confirm all existing tests still pass
      and the 85% domain/ports/in-memory coverage threshold still holds
      — `npm test`: 17 files, 332 tests passed (329 pre-existing + 3 new
      in `dist-exclusions.test.ts`). `npm run test:coverage`: exit 0,
      96.15% overall line coverage (threshold 85%). New barrel files
      (`domain/index.ts`, `adapters/in-memory/index.ts`) show 0% own
      coverage (nothing in the existing suite imports the barrels
      directly yet) but do not pull the global threshold below 85%.
- [x] 6.3 `tsc --noEmit` (existing typecheck script) still passes
      — **caveat**: `tsc --noEmit` was already failing before this change
      (pre-existing, unrelated to package-publishing scope) on two test
      files: `tests/unit/domain/entities/SequenceExecution.test.ts` (5
      call sites pass a partial `RollResult` literal missing
      `mechanic`/`rolls`) and `tests/unit/domain/services/SequenceExecutor.test.ts`
      (2 call sites pass 3 args to `createAleaApi`, which requires 5).
      Confirmed via `git log` these test files are unmodified by this
      change and the errors predate it. This change adds zero new
      `tsc --noEmit` errors (verified: identical error set before/after);
      fixing the pre-existing test bugs is out of this change's scope
      (packaging/distribution only, no domain-behavior changes) and was
      not attempted.

## 7. Publish and document

- [ ] 7.1 `npm publish --access public` for
      `@eldritchforgeworks/dtk-alea@0.1.0` — **requires npm login, handoff
      to principal; do not attempt** (same as `publish-npm-packages`
      tasks 3.1/3.2)
- [ ] 7.2 [smoke] In a network-clean environment:
      `npm install @eldritchforgeworks/dtk-alea` from registry.npmjs.org
      succeeds without credentials — **requires 7.1 — handoff to
      principal**
- [x] 7.3 Add a "Publishing npm packages" entry for `dtk-alea` to
      `AGENTS.md` (extend the existing section added by
      `publish-npm-packages`), noting the domain-only surface and the
      dual build (`vite build && tsc --project tsconfig.build.json`)
- [ ] 7.4 Notify Officina (`m2-sequence-builder`) that U-M2-1 is unblocked
      — after 7.1/7.2 complete — **requires 7.1/7.2 — handoff to
      principal**
