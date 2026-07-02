## ADDED Requirements

### Requirement: Ritus compendium auto-registration
On the Foundry `ready` hook, dtk-alea SHALL scan all enabled module compendium packs whose `documentName` is `"Item"`, retrieve all items of type `dtk.ritus`, and call `AleaApi.registerRitus()` for each. Items that fail schema validation SHALL be skipped with a console warning; they SHALL NOT halt scanning of remaining items.

#### Scenario: Ritus items discovered and registered
- **WHEN** an enabled module ships a compendium pack containing two `dtk.ritus` items
- **THEN** both Ritus entries are present in `RitusRegistry` after `ready`

#### Scenario: Invalid ritus item is skipped with warning
- **WHEN** a compendium pack contains a `dtk.ritus` item whose system data fails schema validation
- **THEN** a console warning is emitted and scanning continues; valid items from the same pack are still registered

#### Scenario: Packs from disabled modules are not scanned
- **WHEN** a module is installed but not enabled
- **THEN** its compendium packs are not scanned and no items from it are registered

---

### Requirement: Sequence compendium auto-registration
On `ready`, dtk-alea SHALL scan all enabled module compendium packs for `dtk.sequence` items and register each in `SequenceExemplarRegistry` keyed by its Foundry UUID (`Compendium.<moduleId>.<packName>.<_id>`).

#### Scenario: Sequence items discovered and registered by UUID
- **WHEN** an enabled module ships a compendium pack containing a `dtk.sequence` item with `_id: "sEq1Strike001xyz"`
- **THEN** `SequenceExemplarRegistry.getByUUID("Compendium.my-system.sequences.sEq1Strike001xyz")` returns the sequence

#### Scenario: Duplicate UUID from two packs logs a warning and keeps first registration
- **WHEN** two packs contain sequence items with the same `_id`
- **THEN** a console warning is logged and the first-registered entry is preserved

---

### Requirement: Codex-entry compendium auto-registration
On `ready`, dtk-lex SHALL scan all enabled module compendium packs for `dtk.codex-entry` items and register them with `CodexRegistry`, grouped by the source module id. Each entry's `displayName` is taken from the item `name`; `slug` and `description` from `system`.

#### Scenario: Codex entries from a module registered under module id
- **WHEN** module `my-system` ships six `dtk.codex-entry` items across one or more packs
- **THEN** `LexApi.getCodex("my-system")` returns all six entries after `ready`

#### Scenario: Codex entries from multiple modules are kept separate
- **WHEN** two modules each ship `dtk.codex-entry` items
- **THEN** each module's entries are retrievable under their own module id without collision
