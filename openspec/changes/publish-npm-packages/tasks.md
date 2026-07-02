## 1. @dtk/types packaging [types]

- [ ] 1.1 [types] Remove `"private": true` from `packages/types/package.json`
- [ ] 1.2 [types] Add `"./sequence"` and `"./codex-entry"` entries to the `exports` map (import + types, mirroring the existing subpath pattern)
- [ ] 1.3 [types] Remove `packages/types/.npmrc` (or replace with an explicit `registry.npmjs.org` line) so publish does not target GitHub Packages
- [ ] 1.4 [test] From a clean temp dir with no auth: `npm pack` the package and verify the tarball contains `dist/` only and all `exports` subpaths resolve (`node -e "import('@dtk/types/sequence')"` against the packed tarball)

## 2. @dtk/promptuarium packaging

- [ ] 2.1 Remove `"private": true` from `packages/promptuarium/package.json`
- [ ] 2.2 Add `files` allowlist (`dist`) and an `exports` map alongside the existing `bin` entry
- [ ] 2.3 Decide and implement the `@dtk/types` dependency form for publish: bundled by the Vite build (verify `dist/cli/index.js` has no unresolved `@dtk/types` import) OR promoted to a regular dependency on the published version
- [ ] 2.4 [test] `npm pack`, install the tarball in a clean temp project with no `.npmrc`, run `npx promptuarium validate` against a sample corpus — must exit 0 with no auth prompt

## 3. Publish and document

- [ ] 3.1 `npm publish --access public` for `@dtk/types@0.1.0`, then `@dtk/promptuarium@0.1.0` (types first)
- [ ] 3.2 [smoke] In a network-clean environment: `npm install @dtk/types @dtk/promptuarium` from registry.npmjs.org succeeds without credentials
- [ ] 3.3 Document the manual publish procedure (order, version bump rules, `--access public`) in the repo
- [ ] 3.4 Update `openspec/config.yaml` context: npm packages are public-registry, not private
- [ ] 3.5 Notify Officina (init-m0-delivery-skeleton) that U2 is unblocked
