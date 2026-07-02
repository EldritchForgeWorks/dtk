## 1. @dtk/types packaging [types]

- [x] 1.1 [types] Remove `"private": true` from `packages/types/package.json`
- [x] 1.2 [types] Add `"./sequence"` and `"./codex-entry"` entries to the `exports` map (import + types, mirroring the existing subpath pattern)
- [x] 1.3 [types] Remove `packages/types/.npmrc` (or replace with an explicit `registry.npmjs.org` line) so publish does not target GitHub Packages — replaced with `@dtk:registry=https://registry.npmjs.org/`
- [x] 1.4 [test] From a clean temp dir with no auth: `npm pack` the package and verify the tarball contains `dist/` only and all `exports` subpaths resolve (`node -e "import('@dtk/types/sequence')"` against the packed tarball) — verified: 115 files, all `dist/**` + `package.json`; all 9 subpaths (incl. `sequence`, `codex-entry`) resolve under Node ESM

## 2. @dtk/promptuarium packaging

- [x] 2.1 Remove `"private": true` from `packages/promptuarium/package.json`
- [x] 2.2 Add `files` allowlist (`dist`) and an `exports` map alongside the existing `bin` entry — `exports` is `{"./package.json": "./package.json"}`: the vite build emits no `.d.ts`, so programmatic import is intentionally unsupported (CLI-only package)
- [x] 2.3 Decide and implement the `@dtk/types` dependency form for publish: bundled by the Vite build (verify `dist/cli/index.js` has no unresolved `@dtk/types` import) OR promoted to a regular dependency on the published version — **bundled**: new `vite.config.cli.ts` builds `src/cli/index.ts` → `dist/cli/index.js`, bundling `@dtk/types` (source alias) + zod + commander; `@dtk/types` removed from the manifest entirely (tsconfig `paths` covers typecheck)
- [x] 2.4 [test] `npm pack`, install the tarball in a clean temp project with no `.npmrc`, run `npx promptuarium validate` against a sample corpus — must exit 0 with no auth prompt — verified: `All valid`, exit 0, `--json` output `{"valid":true,"errors":[]}`

## 3. Publish and document

- [ ] 3.1 `npm publish --access public` for `@dtk/types@0.1.0`, then `@dtk/promptuarium@0.1.0` (types first) — **requires npm login — handoff to principal** (also confirm the `@dtk` scope/org is available or owned on npmjs.com before publishing)
- [ ] 3.2 [smoke] In a network-clean environment: `npm install @dtk/types @dtk/promptuarium` from registry.npmjs.org succeeds without credentials — **requires 3.1 — handoff to principal**
- [x] 3.3 Document the manual publish procedure (order, version bump rules, `--access public`) in the repo — added "Publishing npm packages" section to `AGENTS.md`
- [x] 3.4 Update `openspec/config.yaml` context: npm packages are public-registry, not private
- [ ] 3.5 Notify Officina (init-m0-delivery-skeleton) that U2 is unblocked — after 3.1/3.2 complete
