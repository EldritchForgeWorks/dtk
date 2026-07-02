## ADDED Requirements

### Requirement: enrichHTML applied to dtk-alea.step message payloads
The Foundry adapter layer in dtk-alea SHALL apply `TextEditor.enrichHTML()` to the `message` field of `dtk-alea.step` payloads before creating any `ChatMessage`. This allows sequence `on_tier` message strings to contain `@UUID[...]` links that resolve to clickable Foundry document links in the chat log.

#### Scenario: UUID link in on_tier message renders as clickable link (smoke test)
- **WHEN** a sequence step has `on_tier.hit.message: "Apply @UUID[Compendium.my-system.codex.abc]{Burning}"`
- **AND** the roll resolves to tier `"hit"`
- **THEN** the chat message content contains a rendered anchor element linking to the Burning codex entry

#### Scenario: Plain text message is not altered by enrichHTML
- **WHEN** a sequence step has `on_tier.hit.message: "Solid Hit — deal base damage."`
- **THEN** the chat message content contains the plain text unchanged

---

### Requirement: dtk.codex-entry item sheet renders enriched description
The `CodexEntrySheet` ApplicationV2 SHALL render the `system.description` field using `TextEditor.enrichHTML()` so that cross-references to other compendium entries embedded in descriptions appear as clickable links.

#### Scenario: Description with UUID link renders clickable (smoke test)
- **WHEN** a `dtk.codex-entry` item has `description: "See also @UUID[...]{Exhausted}."`
- **AND** the item sheet is opened
- **THEN** "Exhausted" appears as a clickable link in the rendered sheet
