## ADDED Requirements

### Requirement: dtk.ritus Item subtype registration
dtk-alea SHALL register `dtk.ritus` in `CONFIG.Item.dataModels` during the Foundry `init` hook using a `TypeDataModel` subclass that delegates validation to `RitusSchema` from `@eldritchforgeworks/dtk-types`. The type SHALL appear in Foundry's item type selector only within the compendium browser (not the world item creation dialog).

#### Scenario: Valid ritus item accepted by DataModel
- **WHEN** a Foundry Item of type `dtk.ritus` is created with `system: { mechanic: "pool-count", threshold: 4, tiers: { hit: 1 } }`
- **THEN** the DataModel validates without error and the item is persisted

#### Scenario: Invalid ritus item rejected at DataModel layer
- **WHEN** a Foundry Item of type `dtk.ritus` is created with `system: { threshold: 0 }`
- **THEN** the DataModel validation catches the invalid threshold and logs a descriptive error

---

### Requirement: dtk.sequence Item subtype registration
dtk-alea SHALL register `dtk.sequence` in `CONFIG.Item.dataModels` during `init`. The system schema SHALL contain a `steps` array where each step matches the existing `SequenceStep` union shape (rule or await), with the addition of an optional `ritus` field (Foundry UUID string) on rule steps for cross-pack Ritus references.

#### Scenario: Valid sequence item with ritus UUID accepted
- **WHEN** a `dtk.sequence` item is created with a rule step containing `ritus: "Compendium.my-system.ritus.abc123"`
- **THEN** the DataModel accepts it without error

#### Scenario: Sequence item with empty steps array accepted
- **WHEN** a `dtk.sequence` item is created with `system: { steps: [] }`
- **THEN** the DataModel accepts it

---

### Requirement: dtk.codex-entry Item subtype registration
dtk-lex SHALL register `dtk.codex-entry` in `CONFIG.Item.dataModels` during `init`. The system schema SHALL contain `slug` (non-empty kebab-case string) and `description` (string, optional). The item `name` field serves as `displayName`.

#### Scenario: Valid codex-entry item accepted
- **WHEN** a `dtk.codex-entry` item is created with `name: "Strength"` and `system: { slug: "strength", description: "Raw physical power" }`
- **THEN** the DataModel accepts it

#### Scenario: Codex-entry with invalid slug rejected
- **WHEN** a `dtk.codex-entry` item is created with `system: { slug: "" }`
- **THEN** the DataModel rejects it with a descriptive error
