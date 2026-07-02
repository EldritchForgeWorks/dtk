## ADDED Requirements

### Requirement: Per-module release tags

Each DTK module SHALL be released from this repository under a tag of the form `<module-id>-v<semver>` (e.g. `dtk-alea-v0.2.0`). A tag SHALL release exactly one module.

#### Scenario: Valid module tag triggers a release

- **WHEN** tag `dtk-alea-v0.2.0` is pushed
- **THEN** the release workflow builds only `packages/alea` and publishes release `dtk-alea-v0.2.0`

#### Scenario: Unknown module id fails fast

- **WHEN** tag `dtk-nonexistent-v1.0.0` is pushed
- **THEN** the workflow fails before any release is created

---

### Requirement: Release assets

Every module release SHALL carry exactly two assets: `<module-id>.zip` and `module.json`. The zip SHALL contain `module.json` and the module's runtime files (`dist/`, plus `templates/`, `styles/`, `packs/` where applicable) at the archive root, with no wrapping directory.

#### Scenario: Zip layout accepted by Foundry installer

- **WHEN** `<module-id>.zip` is extracted
- **THEN** `module.json` is at the top level of the extraction

---

### Requirement: Stable manifest URL per module

Each module SHALL have a permanent manifest URL of the form `releases/download/<module-id>-latest/module.json`, served by a moving `<module-id>-latest` release that is recreated on every versioned release of that module. The `module.json` in every release SHALL set `manifest` to this stable URL and `download` to the versioned zip URL (`releases/download/<module-id>-v<semver>/<module-id>.zip`).

#### Scenario: Stable URL serves newest manifest

- **WHEN** `dtk-alea-v0.3.0` is released after `dtk-alea-v0.2.0`
- **THEN** fetching `releases/download/dtk-alea-latest/module.json` returns `version: "0.3.0"`

#### Scenario: Versioned download is immutable

- **WHEN** any later release of the same module is published
- **THEN** `releases/download/dtk-alea-v0.2.0/dtk-alea.zip` still serves the 0.2.0 artifact unchanged

---

### Requirement: Registry document populated from releases

The hub registry JSON document (shape per `module-registry` spec) SHALL carry one entry per released DTK module, with `manifestUrl` set to the module's stable manifest URL and `latestVersion` matching its newest release tag. Regeneration SHALL be part of the release workflow.

#### Scenario: Release updates registry entry

- **WHEN** `dtk-systema-v0.4.0` is released
- **THEN** the registry document's `dtk-systema` entry reads `latestVersion: "0.4.0"` with the unchanged stable `manifestUrl`
