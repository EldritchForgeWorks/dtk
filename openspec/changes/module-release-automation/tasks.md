## 1. Packaging script

- [ ] 1.1 Create `scripts/package-module.mjs`: given a module id, locate its directory (`module/` for `dtk`, else `packages/<name>/`), stamp `version`/`manifest`/`download`/`url` into `module.json`, and zip `module.json` + `dist/` + `templates/` + `styles/` + `packs/` (whichever exist) at archive root as `<module-id>.zip`
- [ ] 1.2 [test] Script test: run against `dtk-fascia`, unzip, assert `module.json` at root (no wrapper dir) and stamped fields present

## 2. Release workflow

- [ ] 2.1 Create `.github/workflows/release.yml` triggered on tag push matching `*-v*`; parse `<module-id>` and `<semver>` from the tag; fail fast on unknown module id
- [ ] 2.2 Build step: `npm ci && npm run build` in the module directory (plus `npm run build:packs` for `dtk-shadowrun`)
- [ ] 2.3 Publish step: `gh release create <module-id>-v<semver>` with `<module-id>.zip` + `module.json`
- [ ] 2.4 Moving-tag step: recreate `<module-id>-latest` release with the same two assets
- [ ] 2.5 [smoke] Tag `dtk-fascia-v0.1.0`; confirm both releases exist and `releases/download/dtk-fascia-latest/module.json` returns the stamped manifest

## 3. Module manifests

- [ ] 3.1 Add static `url` field to all eight `module.json` files; confirm `manifest`/`download` are CI-stamped (not hand-maintained) and document this in each module's README or the repo root
- [ ] 3.2 Fix known manifest defects blocking install: verify each module's `esmodules`/`styles`/`packs` paths exist in the built zip

## 4. Registry document

- [ ] 4.1 Decide registry home (committed `registry.json` on default branch vs asset on `dtk-latest` release) and record in design.md
- [ ] 4.2 Generate registry document per `module-registry` spec (`version: 1`, entries with `id`, `name`, `tier`, `latestVersion`, `manifestUrl`, `description`, `dependencies`) for all eight modules
- [ ] 4.3 Wire registry regeneration into the release workflow so `latestVersion`/`manifestUrl` stay current

## 5. Rollout

- [ ] 5.1 Tag and release all eight modules once (initial versions from current `module.json` files)
- [ ] 5.2 [smoke] In Foundry v13+: install a test module whose `relationships.requires` lists `dtk-alea` by `manifest` URL; confirm auto-install prompt resolves and installs
- [ ] 5.3 Notify Officina (init-m0-delivery-skeleton) that U1 is unblocked with the final manifestUrl list
