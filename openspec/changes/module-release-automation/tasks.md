## 1. Packaging script

- [x] 1.1 Create `scripts/package-module.mjs`: given a module id, locate its directory (`module/` for `dtk`, else `packages/<name>/`), stamp `version`/`manifest`/`download`/`url` into `module.json`, and zip `module.json` + `dist/` + `templates/` + `styles/` + `packs/` (whichever exist) at archive root as `<module-id>.zip` *(stamps a staged copy under `.release/<id>/`; the checked-in module.json is never mutated. Also validates every manifest-declared path exists in the staged tree.)*
- [x] 1.2 [test] Script test: run against `dtk-fascia`, unzip, assert `module.json` at root (no wrapper dir) and stamped fields present *(verified locally for `dtk` and `dtk-fascia`: module.json at zip root, url/manifest/download stamped correctly)*

## 2. Release workflow

- [x] 2.1 Create `.github/workflows/release.yml` triggered on tag push matching `*-v*`; parse `<module-id>` and `<semver>` from the tag; fail fast on unknown module id *(also fails if tag version ≠ module.json version)*
- [x] 2.2 Build step: `npm ci && npm run build` in the module directory (plus `npm run build:packs` for `dtk-shadowrun`) *(lockfiles are currently gitignored, so the workflow falls back to `npm install` when no `package-lock.json` is present; `packages/types` is built first since module builds bundle `@eldritchforgeworks/dtk-types` from its `dist/`. Shadowrun packs are rebuilt from `src/packs` in CI per this task — committed packs are not trusted for release artifacts.)*
- [x] 2.3 Publish step: `gh release create <module-id>-v<semver>` with `<module-id>.zip` + `module.json`
- [x] 2.4 Moving-tag step: recreate `<module-id>-latest` release with the same two assets *(delete `--cleanup-tag` + recreate at `$GITHUB_SHA`, `--latest=false`)*
- [x] 2.5 [smoke] Tag `dtk-fascia-v0.1.0`; confirm both releases exist and `releases/download/dtk-fascia-latest/module.json` returns the stamped manifest *(blocked: requires first push to github.com/EldritchForgeWorks/dtk)* *(verified 2026-07-02: all 8 module runs green; manifests+zips 200; registry updated)*

## 3. Module manifests

- [x] 3.1 Add static `url` field to all eight `module.json` files; confirm `manifest`/`download` are CI-stamped (not hand-maintained) and document this in each module's README or the repo root *(documented in AGENTS.md "Releases" section; in-repo `manifest`/`download` values are defaults only — CI stamping is authoritative)*
- [x] 3.2 Fix known manifest defects blocking install: verify each module's `esmodules`/`styles`/`packs` paths exist in the built zip *(package-module.mjs validates all declared paths against the staged tree and fails the release if any is missing; verified locally for dtk + dtk-fascia)*

## 4. Registry document

- [x] 4.1 Decide registry home (committed `registry.json` on default branch vs asset on `dtk-latest` release) and record in design.md *(decision: committed `registry.json` on `main`, raw URL `https://raw.githubusercontent.com/EldritchForgeWorks/dtk/main/registry.json`)*
- [x] 4.2 Generate registry document per `module-registry` spec (`version: 1`, entries with `id`, `name`, `tier`, `latestVersion`, `manifestUrl`, `description`, `dependencies`) for all eight modules *(tiers per openspec/config.yaml: dtk-lex/dtk-opus premium, rest free; dependencies mirror each module.json `relationships.requires`)*
- [x] 4.3 Wire registry regeneration into the release workflow so `latestVersion`/`manifestUrl` stay current *(final workflow step checks out `main`, runs `scripts/update-registry.mjs <id> <version>`, commits; workflow-level concurrency group serializes releases)*

## 5. Rollout

- [x] 5.1 Tag and release all eight modules once (initial versions from current `module.json` files) *(blocked: requires first push; all eight are at 0.1.0 → tags `dtk-v0.1.0`, `dtk-alea-v0.1.0`, `dtk-lex-v0.1.0`, `dtk-systema-v0.1.0`, `dtk-opus-v0.1.0`, `dtk-fascia-v0.1.0`, `dtk-promptuarium-v0.1.0`, `dtk-shadowrun-v0.1.0`)* *(verified 2026-07-02: all 8 module runs green; manifests+zips 200; registry updated)*
- [ ] 5.2 [smoke] In Foundry v13+: install a test module whose `relationships.requires` lists `dtk-alea` by `manifest` URL; confirm auto-install prompt resolves and installs *(blocked on 5.1)*
- [ ] 5.3 Notify Officina (init-m0-delivery-skeleton) that U1 is unblocked with the final manifestUrl list *(blocked on 5.1)*
