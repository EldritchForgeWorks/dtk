## 1. @dtk/types — Schema exports

- [x] 1.1 [types] Export `SequenceExemplarSchema` and `SequenceExemplar` type from `@dtk/types` (Zod schema covering `id`, `systemId`, `steps[]` with optional `ritus` UUID field on rule steps)
- [x] 1.2 [types] Export `CodexEntryItemSchema` and `CodexEntryItem` type from `@dtk/types` (single-entry shape: `slug`, `description`; distinct from the existing array-based `CodexEntry`)
- [x] 1.3 [types] Add optional `category` string field to `CodexEntryItemSchema` for grouping (attribute, skill, damage-type, currency)
- [x] 1.4 [types] Run `@dtk/types` build and verify all new exports compile cleanly

## 2. dtk-alea — SequenceExemplarRegistry (domain)

- [x] 2.1 [test] Write Vitest tests for `SequenceExemplarRegistry`: register, getByUUID (hit/miss), duplicate warning, all()
- [x] 2.2 [impl] Implement `src/domain/services/SequenceExemplarRegistry.ts` — Map-backed, mirrors `RitusRegistry` structure
- [x] 2.3 [test] Write Vitest tests for `RitusRegistry.getByUUID` and `RitusRegistry.registerByUUID`
- [x] 2.4 [impl] Add `registerByUUID(uuid, ritus)` and `getByUUID(uuid)` methods to `RitusRegistry`

## 3. dtk-alea — executeByRef (domain + port)

- [x] 3.1 [port] Add `IActorRepository` port to dtk-alea if not already present (reuse dtk-systema's interface shape: `getSnapshot(actorId): ActorSnapshot | null`)
- [x] 3.2 [stub] Write `InMemoryActorRepository` in `adapters/in-memory/` implementing the port
- [x] 3.3 [test] Write Vitest tests for `executeByRef`: valid UUID triggers executor, unknown UUID throws, unknown actorId throws
- [x] 3.4 [impl] Implement `executeByRef(uuid, actorId, targetIds)` in `AleaApi` — loads from `SequenceExemplarRegistry`, builds `RollContext`, delegates to `SequenceExecutor`
- [x] 3.5 [adapt] Implement `FoundryActorRepository` in `adapters/foundry/` — reads live `game.actors.get(id)` and converts to `ActorSnapshot`


## 4. dtk-alea — Ritus UUID resolution in RollResolver

- [x] 4.1 [test] Write Vitest tests for `RollResolver` with a step carrying a `ritus` UUID field — verifies UUID lookup path; fallback to systemId when UUID absent
- [x] 4.2 [impl] Update `RollResolver.resolve()` to check `step.ritus` UUID first via `RitusRegistry.getByUUID()`, fall back to `RitusRegistry.resolve(systemId, overrides)`

## 5. dtk-alea — Foundry Item DataModels and compendium scanner

- [x] 5.1 [adapt] Implement `RitusDataModel` in `adapters/foundry/` — extends `TypeDataModel`, delegates `validate()` to `RitusSchema.safeParse()`
- [x] 5.2 [adapt] Implement `SequenceDataModel` in `adapters/foundry/` — extends `TypeDataModel`, delegates to `SequenceExemplarSchema.safeParse()`
- [x] 5.3 [adapt] Implement `CompendiumScanner` in `adapters/foundry/` — walks `game.packs` on `ready`, calls `pack.getIndex()` then `pack.getDocuments()`, registers discovered items; logs timing and skips invalid entries with warnings
- [x] 5.4 [wire] Register `dtk.ritus` and `dtk.sequence` in `CONFIG.Item.dataModels` during dtk-alea `init` hook
- [x] 5.5 [wire] Call `CompendiumScanner.scanAll()` in dtk-alea `ready` hook before `dtk.ready` fires
- [ ] 5.6 [smoke] Verify `dtk.ritus` and `dtk.sequence` items can be created in Foundry compendium browser without errors

## 6. dtk-alea — content enrichment

- [x] 6.1 [adapt] Apply `await TextEditor.enrichHTML(message)` to `on_tier.message` strings before `ChatMessage.create()` in the dtk-alea step result handler
- [ ] 6.2 [smoke] Verify a sequence with `@UUID[...]` in `on_tier.message` renders a clickable link in chat

## 7. dtk-alea — Item sheets

- [x] 7.1 [adapt] Implement `RitusSheet` in `adapters/foundry/` — lazy factory, `ApplicationV2`, template `modules/dtk-alea/templates/ritus-sheet.hbs`, displays mechanic/threshold/tiers
- [x] 7.2 [adapt] Implement `SequenceSheet` in `adapters/foundry/` — lazy factory, `ApplicationV2`, template `modules/dtk-alea/templates/sequence-sheet.hbs`, lists steps with Ritus UUID as content link
- [x] 7.3 [adapt] Write `templates/ritus-sheet.hbs` and `templates/sequence-sheet.hbs` Handlebars templates
- [x] 7.4 [wire] Register `RitusSheet` and `SequenceSheet` as default sheets for their item types during dtk-alea `init`
- [ ] 7.5 [smoke] Open a `dtk.ritus` compendium entry; verify the sheet renders without JS errors
- [ ] 7.6 [smoke] Open a `dtk.sequence` compendium entry; verify the sheet renders step list

## 8. dtk-lex — Foundry Item DataModel and compendium scanner

- [x] 8.1 [adapt] Implement `CodexEntryDataModel` in `adapters/foundry/` — extends `TypeDataModel`, delegates to `CodexEntryItemSchema.safeParse()`
- [x] 8.2 [adapt] Implement `CompendiumScanner` in dtk-lex `adapters/foundry/` — walks `game.packs` on `ready`, registers `dtk.codex-entry` items under their source module id
- [x] 8.3 [wire] Register `dtk.codex-entry` in `CONFIG.Item.dataModels` during dtk-lex `init` hook
- [x] 8.4 [wire] Call `CompendiumScanner.scanAll()` in dtk-lex `ready` hook
- [ ] 8.5 [smoke] Verify `dtk.codex-entry` items can be created in Foundry compendium browser

## 9. dtk-lex — CodexEntrySheet

- [x] 9.1 [adapt] Implement `CodexEntrySheet` in `adapters/foundry/` — lazy factory, `ApplicationV2`, renders `system.description` via `TextEditor.enrichHTML()`
- [x] 9.2 [adapt] Write `templates/codex-entry-sheet.hbs` Handlebars template
- [x] 9.3 [wire] Register `CodexEntrySheet` as default sheet for `dtk.codex-entry` during dtk-lex `init`
- [ ] 9.4 [smoke] Open a `dtk.codex-entry` compendium entry; verify description renders with enriched links

## 10. dtk-runeforge demo — convert to compendium-only

- [x] 10.1 Create `packs/src/ritus/standard-pool.json` — `dtk.ritus` item with pool-count mechanic
- [x] 10.2 Create `packs/src/sequences/strike.json` — `dtk.sequence` item referencing the ritus by UUID
- [x] 10.3 Create `packs/src/codex/` — one `dtk.codex-entry` item per vocabulary word (strength, agility, wits, melee, ranged, stealth, physical, fire)
- [x] 10.4 Add compendium pack declarations to `module.json`
- [x] 10.5 Remove all JS registration calls from `dtk-runeforge.js` (registerRitus, registerCodex)
- [x] 10.6 Replace `alea.execute(buildStrikeContext(n))` with `alea.executeByRef(strikeUUID, actorId, [])`
- [ ] 10.7 [smoke] Reload Foundry; verify roll works end-to-end with no JS registration code in the demo module

