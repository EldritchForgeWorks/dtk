## Why

Requested by: DTK Officina change init-m0-delivery-skeleton (M0).

Foundry v13 auto-installs a module's `relationships.requires` entries only when each required module has a reachable `manifest` URL. Officina-generated GM systems will declare `requires` on the DTK modules — but DTK today publishes **no** release artifacts at all: there is no `.github/workflows/` directory, no GitHub Releases, and no `manifest`/`download` fields in any `module.json`. The hub's own `installer-ui` and `update-checker` specs already assume a registry whose entries carry a required `manifestUrl` (see `openspec/specs/module-registry/spec.md`), yet no such URLs exist. This change creates them.

## What Changes

Modules in scope (all Foundry module IDs; tiers per config): `dtk` (hub, `module/`, FREE), `dtk-alea` (FREE), `dtk-lex` (PREMIUM candidate), `dtk-systema` (FREE), `dtk-opus` (PREMIUM candidate), `dtk-fascia` (FREE), `dtk-promptuarium` (module side, FREE), `dtk-shadowrun` (example system). No npm packages involved (see `publish-npm-packages` for those).

- **Per-module release tags** from this repo: `<module-id>-v<semver>` (e.g. `dtk-alea-v0.2.0`). `releases/latest/download/` only serves one "latest" per repo, so it cannot serve eight modules — per-module tags are required. Full option analysis in `design.md`.
- **Stable manifest URL per module** via a per-module moving tag: each release also force-updates a `<module-id>-latest` tag/release, giving `https://github.com/<owner>/dtk/releases/download/<module-id>-latest/module.json` as the permanent `manifestUrl`. The versioned release's `module.json` `download` field points at the immutable versioned zip.
- **Asset naming**: every release carries exactly two assets — `<module-id>.zip` and `module.json`.
- **Zip layout**: `module.json`, `dist/`, `templates/`, `styles/`, `packs/` (as applicable) at the **archive root** (no wrapping directory), matching Foundry's installer expectation.
- **`module.json` release fields**: add `manifest` (stable URL) and `download` (versioned zip URL) to each module's manifest at build time; keep `version` in sync with the tag.
- **CI workflow** (`.github/workflows/release.yml`): on push of a `<module-id>-v*` tag — build that module (`npm ci && npm run build` in its directory), stamp version/manifest/download into `module.json`, zip, create the versioned release, update the `<module-id>-latest` release.
- **Hub registry document**: populate the registry JSON consumed by the hub (per `module-registry` spec: `{ version: 1, modules: [...] }`) with the resulting `manifestUrl` per module; serve it from a stable raw URL in this repo.

## Non-goals

- No change to hub installer-ui/update-checker runtime code — this change produces the artifacts and registry data those specs already assume.
- No premium licensing/gating mechanics (dtk-lex/dtk-opus release publicly for now; gating is a separate change).
- No splitting modules into separate repos (config's stated end-state); the tag scheme survives a later extraction unchanged.
- No Foundry package-listing (foundryvtt.com) submission.

## Capabilities

### New Capabilities

- `module-release`: requirements for per-module tags, release assets, stable manifest URLs, zip layout, and the CI build-and-attach workflow.

### Modified Capabilities

*(none — `module-registry` entry shape already requires `manifestUrl`; this change populates data, it does not alter the schema)*

## Impact

- New: `.github/workflows/release.yml`, a shared packaging script (e.g. `scripts/package-module.mjs`), registry JSON document.
- Modified: `module/module.json` and each `packages/*/module.json` gain `manifest`, `download`, `url` fields.
- **Downstream**: Officina-generated systems can list DTK modules in `relationships.requires` and Foundry v13+ auto-installs them; hub installer-ui/update-checker become implementable; M0 blocker (U1) clears.
