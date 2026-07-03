## 1. Package metadata

- [ ] 1.1 Remove `"private": true` from `packages/alea/package.json`
- [ ] 1.2 Add `engines: { node: ">=20" }`, `license: "MIT"`, `repository`
      (`git+https://github.com/EldritchForgeWorks/dtk.git`, directory
      `packages/alea`), `homepage`
      (`https://github.com/EldritchForgeWorks/dtk#readme`), `publishConfig:
      { access: "public", registry: "https://registry.npmjs.org/" }`,
      `files: ["dist"]` — mirror `packages/types/package.json` exactly
- [ ] 1.3 Add `packages/alea/.npmrc` with
      `@eldritchforgeworks:registry=https://registry.npmjs.org/` (copy
      `packages/types/.npmrc`)

## 2. Parallel tsc build target [impl]

- [ ] 2.1 Add `packages/alea/tsconfig.build.json`: extends `./tsconfig.json`,
      `rootDir: ./src`, `declaration: true`, `declarationMap: true`,
      `outDir: ./dist` — `include` covers `src/domain/**`, `src/ports/**`,
      `src/adapters/in-memory/**`, `src/AleaApi.ts`; `exclude` explicitly
      lists `src/index.ts` and `src/adapters/foundry/**` (do not rely on
      absence from `include` alone — state the exclusion explicitly so it
      survives future `include` glob edits)
- [ ] 2.2 Update `packages/alea/package.json` `build` script to
      `"vite build && tsc --project tsconfig.build.json"` — the existing
      Vite/Foundry-module build must run unmodified; the tsc build is
      additive
- [ ] 2.3 Confirm `tsc --project tsconfig.build.json` emits `dist/**/*.js` +
      `dist/**/*.d.ts` for domain/ports/in-memory-adapters/AleaApi only, and
      does NOT emit anything under `dist/adapters/foundry/`

## 3. Exports map [impl]

- [ ] 3.1 Add `exports` map to `packages/alea/package.json`:
      `.` → `AleaApi` facade + top-level barrel, `./domain` → entities +
      services + value-objects, `./ports` → the five port interfaces,
      `./adapters/in-memory` → the five test doubles — each with `types`
      + `import` conditions pointing at the tsc-built `.d.ts`/`.js` pairs
- [ ] 3.2 Add/verify barrel `index.ts` files exist for `src/domain/`,
      `src/ports/`, `src/adapters/in-memory/` (one barrel per exported
      subpath, matching the `@eldritchforgeworks/dtk-types` per-contract
      barrel pattern) so each `exports` entry has a single stable entry
      file to point at
- [ ] 3.3 [test] `npm pack --dry-run` in `packages/alea` — assert the file
      list contains ONLY `dist/**` (no `src/adapters/foundry/**`, no
      `src/index.ts`-derived output, no `templates/`, no `tests/`) and
      `package.json`

## 4. Exclude Foundry adapters — structural guarantee [test]

- [ ] 4.1 [test] Add a build-time or CI check that fails if any file under
      `dist/adapters/foundry/` exists after `npm run build` (defense in
      depth beyond the tsconfig `exclude` — e.g. a short script asserting
      the directory is absent, run as part of `npm run build` or a
      pretest hook)
- [ ] 4.2 [test] Add an explicit unit/lint assertion (or `grep`-based CI
      step) that no file reachable via the package's `exports` map
      transitively imports anything under `src/adapters/foundry/`

## 5. Node-clean smoke test [smoke]

- [ ] 5.1 [smoke] Write a plain Node.js script (no Foundry globals defined,
      no `jsdom`/Foundry shim) that imports `SequenceExecutor` and the five
      in-memory adapters from the built package (via `dist/`, or the packed
      tarball installed into a scratch project), composes them, executes a
      fixture `dtk.sequence` exemplar (reuse or adapt an existing fixture
      from `tests/fixtures/exemplar.ts`), and asserts on the emitted
      `dtk-alea.step` / `dtk-alea.await` / `dtk-alea.complete` events via
      `SpyHookEmitter`
- [ ] 5.2 [smoke] Run the script in a subprocess with no `game`/`Hooks`
      globals defined and confirm it exits 0 with no `ReferenceError` —
      this is the acceptance bar: a domain surface that accidentally pulls
      in a Foundry-adapter transitive import must fail this check, not
      Officina's build

## 6. Verify existing build/tests still green

- [ ] 6.1 Run `vite build` in `packages/alea` and confirm `dist/dtk-alea.js`
      is produced unchanged (Foundry module build untouched)
- [ ] 6.2 Run the existing Vitest suite (`npm test` /
      `npm run test:coverage`) and confirm all existing tests still pass
      and the 85% domain/ports/in-memory coverage threshold still holds
- [ ] 6.3 `tsc --noEmit` (existing typecheck script) still passes

## 7. Publish and document

- [ ] 7.1 `npm publish --access public` for
      `@eldritchforgeworks/dtk-alea@0.1.0` — **requires npm login, handoff
      to principal; do not attempt** (same as `publish-npm-packages`
      tasks 3.1/3.2)
- [ ] 7.2 [smoke] In a network-clean environment:
      `npm install @eldritchforgeworks/dtk-alea` from registry.npmjs.org
      succeeds without credentials — **requires 7.1 — handoff to
      principal**
- [ ] 7.3 Add a "Publishing npm packages" entry for `dtk-alea` to
      `AGENTS.md` (extend the existing section added by
      `publish-npm-packages`), noting the domain-only surface and the
      dual build (`vite build && tsc --project tsconfig.build.json`)
- [ ] 7.4 Notify Officina (`m2-sequence-builder`) that U-M2-1 is unblocked
      — after 7.1/7.2 complete
