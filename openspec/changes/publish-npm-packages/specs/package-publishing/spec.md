## ADDED Requirements

> **Note (2026-07-02):** package names renamed from `@dtk/types` / `@dtk/promptuarium` to `@eldritchforgeworks/dtk-types` / `@eldritchforgeworks/dtk-promptuarium` — the `@dtk` npm scope is not owned by the principal. Foundry module ids are unaffected.

### Requirement: Public registry availability without credentials

`@eldritchforgeworks/dtk-types` and `@eldritchforgeworks/dtk-promptuarium` SHALL be published to the public npm registry (`registry.npmjs.org`) and SHALL be installable in a clean environment with no `.npmrc`, no auth token, and no registry override.

#### Scenario: Clean install of @eldritchforgeworks/dtk-types

- **WHEN** `npm install @eldritchforgeworks/dtk-types` runs in a project with no `.npmrc` and no credentials
- **THEN** the install succeeds from registry.npmjs.org

#### Scenario: Clean install and run of promptuarium CLI

- **WHEN** `npm install @eldritchforgeworks/dtk-promptuarium && npx promptuarium validate` runs in a credential-free CI environment
- **THEN** the install succeeds and the CLI executes without auth errors

---

### Requirement: Complete exports map on @eldritchforgeworks/dtk-types

The `@eldritchforgeworks/dtk-types` `exports` map SHALL expose every contract subpath that the root barrel re-exports: `.`, `./ritus`, `./codex`, `./forma`, `./modus`, `./exemplar`, `./apis`, `./sequence`, `./codex-entry` — each with `import` and `types` conditions.

#### Scenario: Sequence subpath resolves

- **WHEN** a consumer imports from `@eldritchforgeworks/dtk-types/sequence`
- **THEN** Node ESM resolution succeeds and TypeScript finds the declaration file

#### Scenario: Codex-entry subpath resolves

- **WHEN** a consumer imports from `@eldritchforgeworks/dtk-types/codex-entry`
- **THEN** Node ESM resolution succeeds and TypeScript finds the declaration file

---

### Requirement: Published promptuarium package shape

The published `@eldritchforgeworks/dtk-promptuarium` package SHALL include a `files` allowlist and an `exports` map in addition to its `bin` entry, and SHALL NOT reference `@eldritchforgeworks/dtk-types` via a `file:` specifier in the published manifest.

#### Scenario: Packed tarball is self-contained

- **WHEN** `npm pack` is run and the tarball is installed in an empty project
- **THEN** the `promptuarium` bin runs without unresolved imports
