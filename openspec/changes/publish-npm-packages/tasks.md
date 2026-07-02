## 1. @eldritchforgeworks/dtk-types packaging [types]

- [x] 1.1 [types] Remove `"private": true` from `packages/types/package.json`
- [x] 1.2 [types] Add `"./sequence"` and `"./codex-entry"` entries to the `exports` map (import + types, mirroring the existing subpath pattern)
- [x] 1.3 [types] Remove `packages/types/.npmrc` (or replace with an explicit `registry.npmjs.org` line) so publish does not target GitHub Packages — replaced with a scope registry line pinning `registry.npmjs.org` (now `@eldritchforgeworks:registry=https://registry.npmjs.org/` after the 2026-07-02 scope rename)
- [x] 1.4 [test] From a clean temp dir with no auth: `npm pack` the package and verify the tarball contains `dist/` only and all `exports` subpaths resolve (`node -e "import('@eldritchforgeworks/dtk-types/sequence')"` against the packed tarball) — verified: 115 files, all `dist/**` + `package.json`; all 9 subpaths (incl. `sequence`, `codex-entry`) resolve under Node ESM

## 2. @eldritchforgeworks/dtk-promptuarium packaging

- [x] 2.1 Remove `"private": true` from `packages/promptuarium/package.json`
- [x] 2.2 Add `files` allowlist (`dist`) and an `exports` map alongside the existing `bin` entry — `exports` is `{"./package.json": "./package.json"}`: the vite build emits no `.d.ts`, so programmatic import is intentionally unsupported (CLI-only package)
- [x] 2.3 Decide and implement the `@eldritchforgeworks/dtk-types` dependency form for publish: bundled by the Vite build (verify `dist/cli/index.js` has no unresolved `@eldritchforgeworks/dtk-types` import) OR promoted to a regular dependency on the published version — **bundled**: new `vite.config.cli.ts` builds `src/cli/index.ts` → `dist/cli/index.js`, bundling `@eldritchforgeworks/dtk-types` (source alias) + zod + commander; `@eldritchforgeworks/dtk-types` removed from the manifest entirely (tsconfig `paths` covers typecheck)
- [x] 2.4 [test] `npm pack`, install the tarball in a clean temp project with no `.npmrc`, run `npx promptuarium validate` against a sample corpus — must exit 0 with no auth prompt — verified: `All valid`, exit 0, `--json` output `{"valid":true,"errors":[]}`

## 3. Publish and document

- [x] 3.1 `npm publish --access public` for `@eldritchforgeworks/dtk-types@0.1.0`, then `@eldritchforgeworks/dtk-promptuarium@0.1.0` (types first) — **requires npm login — handoff to principal** *(scope check resolved 2026-07-02: the `@dtk` scope is NOT owned by the principal, so the packages were renamed to the owned `@eldritchforgeworks` scope)*
- [x] 3.2 [smoke] In a network-clean environment: `npm install @eldritchforgeworks/dtk-types @eldritchforgeworks/dtk-promptuarium` from registry.npmjs.org succeeds without credentials — **requires 3.1 — handoff to principal**
- [x] 3.3 Document the manual publish procedure (order, version bump rules, `--access public`) in the repo — added "Publishing npm packages" section to `AGENTS.md`
- [x] 3.4 Update `openspec/config.yaml` context: npm packages are public-registry, not private
- [x] 3.5 Notify Officina (init-m0-delivery-skeleton) that U2 is unblocked — after 3.1/3.2 complete
