# module-registry Specification

## Purpose
TBD - created by archiving change dtk-hub. Update Purpose after archive.
## Requirements
### Requirement: Registry entry shape

Each entry in the remote registry SHALL carry:

- `id` — Foundry module id string (e.g., `"dtk-systema"`)
- `name` — human-readable module name
- `tier` — `"free"` | `"premium"`
- `latestVersion` — semver string
- `manifestUrl` — URL string pointing to the module's Foundry manifest JSON
- `description` — one-sentence plain text description
- `dependencies` — array of Foundry module id strings (may be empty)
- `changelogUrl?` — optional URL string

#### Scenario: Valid free module entry accepted

- **WHEN** an entry declares `{ id: "dtk-systema", tier: "free", latestVersion: "0.3.1", manifestUrl: "https://...", dependencies: ["dtk"], ... }`
- **THEN** the registry schema accepts it

#### Scenario: Entry missing manifestUrl rejected

- **WHEN** an entry omits `manifestUrl`
- **THEN** the registry schema returns an error

#### Scenario: Invalid tier rejected

- **WHEN** `tier: "trial"` is declared
- **THEN** the registry schema returns an error listing valid values

#### Scenario: Invalid semver latestVersion rejected

- **WHEN** `latestVersion: "latest"` is declared
- **THEN** the registry schema returns an error

---

### Requirement: Registry document shape

The remote registry JSON document SHALL carry:

- `version` — positive integer schema version (current: `1`)
- `modules` — array of registry entries (may be empty)

#### Scenario: Valid registry document accepted

- **WHEN** `{ version: 1, modules: [...] }` is fetched and parsed
- **THEN** the registry schema accepts it

#### Scenario: Unknown schema version rejected

- **WHEN** `{ version: 99, modules: [] }` is received
- **THEN** the hub logs a warning and falls back to cached data

---

### Requirement: Registry caching in world settings

The hub SHALL cache the last successfully fetched registry document in a world setting
(`dtk.registryCache`). The cache SHALL store the full document plus a `fetchedAt`
ISO timestamp. The cache is used when the remote fetch fails (network error, offline
play). Cache entries do not expire automatically — they persist until the next
successful fetch.

#### Scenario: Successful fetch updates cache

- **WHEN** the hub fetches the registry successfully on the `ready` hook
- **THEN** the fetched document is written to `game.settings.get("dtk", "registryCache")`

#### Scenario: Failed fetch uses cached data

- **WHEN** the remote registry URL returns an error or times out
- **THEN** the hub uses the cached document and logs a console warning with the fetch error

#### Scenario: No cache and failed fetch

- **WHEN** no cache exists and the remote fetch fails
- **THEN** the installer UI shows an empty module list with a "registry unavailable" message

---

### Requirement: Registry TypeScript types

`@dtk/types` SHALL NOT carry registry types — registry types are internal to the hub
module. The hub SHALL define `RegistryEntry`, `RegistryDocument`, and `RegistryCache`
as module-private TypeScript interfaces in `src/registry/types.ts`. Zod schemas SHALL
validate incoming JSON from the remote source and from the world settings cache.

#### Scenario: Registry types are hub-private

- **WHEN** consuming code imports from `@dtk/types`
- **THEN** no registry types are exported — they are not part of the public DTK contract

