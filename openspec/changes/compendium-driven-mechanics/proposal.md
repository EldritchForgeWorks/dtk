## Why

DTK's promise is that game designers author game systems without writing JavaScript — but currently every DTK contract (Ritus, Codex, SequenceExemplar) must be registered via JS API calls at runtime. The compendium infrastructure to make these contracts authorable as Foundry documents and discoverable automatically does not exist, blocking the primary designer workflow.

## What Changes

- `dtk-alea` registers `dtk.ritus` and `dtk.sequence` as Foundry Item subtypes with validated DataModel schemas
- `dtk-lex` registers `dtk.codex-entry` as a Foundry Item subtype with a validated DataModel schema
- All three modules scan enabled module compendium packs at `ready` and auto-register discovered items — no JS registration calls required from system authors
- `dtk-alea` gains `executeByRef(uuid, actorId, targetIds)` so a roll can be triggered by compendium UUID rather than an inline-constructed `RollContext`
- Sequence steps reference their Ritus by compendium UUID (`Compendium.module.pack.id`) rather than by `systemId` string
- Chat output from `dtk-alea.step` is run through `TextEditor.enrichHTML()` so inline `@UUID[...]` links to Codex entries render as clickable Foundry document links
- `dtk-alea` and `dtk-lex` ship item sheets (`ApplicationV2`) for `dtk.ritus`, `dtk.sequence`, and `dtk.codex-entry` so compendium entries are player-readable documentation

## Capabilities

### New Capabilities

- `compendium-item-types`: Foundry DataModel registration for `dtk.ritus`, `dtk.sequence`, and `dtk.codex-entry` Item subtypes; includes schema validation and `CONFIG.Item.dataModels` wiring
- `compendium-scanner`: Auto-discovery and registration of DTK Items from all enabled module compendium packs at `ready` time
- `execute-by-ref`: `AleaApi.executeByRef(uuid, actorId, targetIds)` — load a sequence from the registry by UUID, build `RollContext` from live Foundry documents via dtk-systema, execute through the existing pipeline
- `content-enrichment`: `TextEditor.enrichHTML()` applied to DTK chat output so `@UUID[...]` links in sequence `on_tier` messages resolve to clickable compendium document links
- `dtk-item-sheets`: `ApplicationV2` sheets for `dtk.ritus`, `dtk.sequence`, and `dtk.codex-entry` items providing player-readable documentation views in the compendium browser

### Modified Capabilities

- `ritus-registry`: Ritus resolution gains a UUID lookup path; sequence steps reference Ritus by compendium UUID in addition to the existing `systemId` string fallback
- `sequence-executor`: `SequenceExemplarRegistry` added as a new dependency; executor retrieves sequences by UUID from registry in the `executeByRef` path

## Impact

- **dtk-alea** (`src/`): new `adapters/foundry/RitusDataModel.ts`, `SequenceDataModel.ts`, `SequenceExemplarRegistry.ts`, `CompendiumScanner.ts`, `ItemSheets.ts`; modified `AleaApi.ts`, `RitusRegistry.ts`, `index.ts`
- **dtk-lex** (`src/`): new `adapters/foundry/CodexEntryDataModel.ts`, `CompendiumScanner.ts`, `CodexEntrySheet.ts`; modified `index.ts`
- **@dtk/types**: `RitusSchema`, `SequenceExemplarSchema`, `CodexEntrySchema` exported for DataModel validation
- **System module authors**: no breaking changes — existing JS registration calls continue to work; compendium-based registration is additive
- **dtk-runeforge demo**: once compendium items exist, all JS registration code can be removed
