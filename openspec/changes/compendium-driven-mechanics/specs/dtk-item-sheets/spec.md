## ADDED Requirements

### Requirement: RitusSheet — readable Ritus documentation
dtk-alea SHALL provide a `RitusSheet` ApplicationV2 class registered as the default sheet for `dtk.ritus` items. The sheet SHALL display mechanic, threshold, and tier breakpoints in a human-readable format. It SHALL use the lazy factory pattern to defer `HandlebarsApplicationMixin(ApplicationV2)` evaluation until after Foundry `init`.

#### Scenario: Ritus sheet opens without error (smoke test)
- **WHEN** a `dtk.ritus` compendium entry is opened in Foundry
- **THEN** the sheet renders showing mechanic, threshold, and tier values without a JS error

---

### Requirement: SequenceSheet — readable sequence documentation with step list
dtk-alea SHALL provide a `SequenceSheet` ApplicationV2 class registered as the default sheet for `dtk.sequence` items. The sheet SHALL display the ordered step list; rule steps that reference a Ritus by UUID SHALL render the Ritus name as a content link.

#### Scenario: Sequence sheet opens and shows steps (smoke test)
- **WHEN** a `dtk.sequence` compendium entry with two rule steps is opened
- **THEN** the sheet renders with both steps visible and the Ritus reference displayed

---

### Requirement: CodexEntrySheet — player-readable glossary card
dtk-lex SHALL provide a `CodexEntrySheet` ApplicationV2 class registered as the default sheet for `dtk.codex-entry` items. The sheet SHALL display `name` as the title and render `system.description` via `TextEditor.enrichHTML()`.

#### Scenario: Codex entry sheet opens with rendered description (smoke test)
- **WHEN** a `dtk.codex-entry` compendium item is opened
- **THEN** the sheet renders with the item name as title and the description as enriched HTML
