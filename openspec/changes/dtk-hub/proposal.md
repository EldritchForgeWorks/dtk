## Why

Game designers who want to build with DTK need a single entry point that handles
module discovery, installation, and coordination — without requiring them to
manually manage Foundry manifest URLs and inter-module load order. The hub is
that entry point: install one module, get the whole ecosystem.

## What Changes

- Introduces `dtk` as a new Foundry module living in this repo alongside `@dtk/types`
- Provides a GM-facing UI for discovering, installing, and updating DTK ecosystem modules
- Implements the `getDtkModuleApi` / `isDtkModuleInstalled` helpers declared in `@dtk/types/apis` — the hub is the only module that has the full picture of what's installed
- Exposes the `game.dtk` global namespace object as the coordination point for all DTK modules
- Emits `dtk.ready` Foundry hook after all active DTK modules have signalled readiness
- Provides an update-check mechanism (on `ready` hook, GM-only) that queries the registry and surfaces available updates as a Foundry notification

## Capabilities

### New Capabilities

- `module-registry`: The catalog contract — the shape of a DTK module manifest entry (id, name, tier, version, dependencies, manifestUrl, changelogUrl). Sourced from a remote JSON registry file; cached locally in world settings.
- `installer-ui`: ApplicationV2 GM interface for browsing available modules (free vs premium), viewing installed/available versions, and triggering Foundry's native module installer with the correct manifest URL.
- `module-coordinator`: The runtime coordination layer — loads after all Foundry modules, collects `dtk-*.ready` hooks, emits `dtk.ready` when the full active set is ready, exposes `game.dtk` namespace, implements `getDtkModuleApi` and `isDtkModuleInstalled`.
- `update-checker`: On `ready` hook (GM only), fetches the remote registry, compares installed module versions to latest, and surfaces a Foundry UI notification listing available updates with a link to the installer.

### Modified Capabilities

_(none — this change introduces only new capabilities)_

## Impact

- **New Foundry module**: `dtk` (id: `dtk`), lives in `/module/` inside this repo
- **`@dtk/types/apis`**: `getDtkModuleApi` and `isDtkModuleInstalled` are declared as type stubs in `@dtk/types`; `dtk` provides the runtime implementations — no other module should implement these
- **Load order**: `dtk` must list all other DTK modules as optional dependencies in its `module.json` so Foundry loads it last in the DTK set
- **No runtime dependency on other DTK modules**: the hub coordinates but does not import from dtk-alea, dtk-systema, etc. — coupling is one-way (they depend on the hub's `game.dtk` namespace, not the reverse)
- **Remote registry URL**: a static JSON file hosted on GitHub Pages or similar; the hub fetches it; the URL is a module setting with a sensible default
