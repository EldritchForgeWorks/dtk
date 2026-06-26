# Spec: codex-registry

The Codex registry stores game term entries (attributes, skills, conditions, derived
stats) keyed by system id and slug. It is the authoritative glossary for `@-references`
in expression strings across the DTK ecosystem.

## ADDED Requirements

### Requirement: Codex registration via LexApi

`LexApi.registerCodex(systemId: string, entries: CodexEntry[])` SHALL validate each
entry against `CodexEntrySchema` and store them scoped to `systemId`. Re-registration
of a systemId replaces all prior entries for that system and logs a console warning.
An entry with a duplicate slug within the same call SHALL use the last declared value
(last-wins within a batch).

#### Scenario: Valid entries stored by system id

- **WHEN** `LexApi.registerCodex("sr5e", [{ slug: "agility", displayName: "Agility" }])` is called
- **THEN** `CodexRegistry.resolve("sr5e", "agility")` returns the `CodexEntry`

#### Scenario: Re-registration replaces all entries and warns

- **WHEN** `LexApi.registerCodex("sr5e", newEntries)` is called a second time
- **THEN** a console warning is logged and only `newEntries` are stored for `"sr5e"`

#### Scenario: Invalid entry throws descriptive error

- **WHEN** an entry missing `displayName` is included in the batch
- **THEN** a descriptive error is thrown identifying the invalid entry slug

---

### Requirement: Slug resolution per system

`CodexRegistry.resolve(systemId: string, slug: string): CodexEntry | null` SHALL return
the entry for the given system+slug pair, or `null` if not found. Cross-system slug
lookup is not supported — each system's namespace is isolated.

#### Scenario: Known slug resolves

- **WHEN** `CodexRegistry.resolve("sr5e", "agility")` is called after registration
- **THEN** the `CodexEntry` with `displayName: "Agility"` is returned

#### Scenario: Unknown slug returns null

- **WHEN** `CodexRegistry.resolve("sr5e", "nonexistent")` is called
- **THEN** `null` is returned without throwing

#### Scenario: Slug from different system returns null

- **WHEN** `"dcc"` is registered with slug `"luck"` and `CodexRegistry.resolve("sr5e", "luck")` is called
- **THEN** `null` is returned (namespace isolation)

---

### Requirement: Slug listing for visual editor autocomplete

`CodexRegistry.listSlugs(systemId: string): string[]` SHALL return all registered
slugs for the given system, sorted alphabetically. Returns an empty array for an
unregistered system.

#### Scenario: Slugs listed alphabetically

- **WHEN** entries `["willpower", "agility", "body"]` are registered for `"sr5e"`
- **THEN** `listSlugs("sr5e")` returns `["agility", "body", "willpower"]`

#### Scenario: Unregistered system returns empty array

- **WHEN** `listSlugs("unknown-system")` is called
- **THEN** `[]` is returned

---

### Requirement: Codex JSON export for dtk-promptuarium

`LexApi.exportCodexJson(systemId: string): Record<string, string>` SHALL return a
plain JSON-serialisable object mapping `slug → displayName` for all entries of the
given system. Returns `{}` for an unregistered system.

#### Scenario: Export maps slug to displayName

- **WHEN** system `"sr5e"` has entries `agility → "Agility"` and `body → "Body"`
- **THEN** `exportCodexJson("sr5e")` returns `{ agility: "Agility", body: "Body" }`

#### Scenario: Export for unregistered system returns empty object

- **WHEN** `exportCodexJson("no-such-system")` is called
- **THEN** `{}` is returned
