## Context

DTK contracts (Ritus, Codex, SequenceExemplar) currently require JavaScript API calls to register at runtime. Game designers who want to build a system without writing code have no path — everything must be wired in `init` hooks by a developer. This change introduces compendium-backed Foundry Item types and auto-registration so a system module can be pure data: compendium packs and a `module.json`, zero JavaScript.

Current registration flow (JS-required):
```
Hooks.once('dtk.ready', ({ dtk }) => {
  dtk.getApi('dtk-alea').registerRitus({ id: 'my-system', ... })  // ← JS
  dtk.getApi('dtk-lex').registerCodex('my-system', [...])          // ← JS
})
```

Target flow (data-only):
```
packs/ritus/standard-pool.json   ← Item { type: "dtk.ritus", system: {...} }
packs/sequences/strike.json      ← Item { type: "dtk.sequence", system: {...} }
packs/codex/strength.json        ← Item { type: "dtk.codex-entry", system: {...} }
// DTK discovers and registers all of them automatically on ready
```

## Goals / Non-Goals

**Goals:**
- Register `dtk.ritus`, `dtk.sequence`, `dtk.codex-entry` as Foundry Item subtypes with schema validation
- Auto-discover and register all three types from enabled module compendium packs at `ready`
- Add `AleaApi.executeByRef(uuid, actorId, targetIds)` for ref-based sequence triggering
- Apply `TextEditor.enrichHTML()` to `dtk-alea.step` message payloads so `@UUID[...]` links work in chat
- Add `ApplicationV2` item sheets for all three types

**Non-Goals:**
- No changes to domain logic (RitusRegistry, RollResolver, SequenceExecutor internals)
- No Modus or Forma compendium items in this change
- No UI for creating or editing DTK items (Foundry's built-in item sheet is the editor)
- No world-level DTK item documents — compendium only

## Decisions

### D1: DataModel registration — TypeDataModel subclasses, not bare objects

Foundry v12+ requires `CONFIG.Item.dataModels[type]` to be a `TypeDataModel` subclass. Each DTK module registers a thin wrapper class whose `prepareBaseData()` and `validate()` delegate to the existing Zod schemas from `@dtk/types`. This keeps validation logic in the shared kernel and Foundry wiring in `adapters/foundry/`.

Alternative considered: register raw schema objects (v11 style). Rejected — not supported in v12+.

### D2: SequenceExemplarRegistry keyed by Foundry UUID

Sequences are stored in a new `SequenceExemplarRegistry` (mirrors `RitusRegistry`) keyed by the full Foundry UUID string (`Compendium.<moduleId>.<packName>.<_id>`). UUIDs are stable as long as authors don't regenerate `_id` values; they are globally unique across all enabled modules.

Alternative considered: key by a custom `system.id` slug. Rejected — would require designers to manage uniqueness manually; UUID is already globally unique by construction.

### D3: Ritus referenced from sequence steps by UUID

Rule steps gain an optional `ritus` field (Foundry UUID string). When present, `RollResolver` resolves the Ritus via `RitusRegistry.getByUUID(uuid)` rather than `RitusRegistry.resolve(systemId, overrides)`. The existing `systemId` path is preserved as fallback for JS-registered Ritus entries.

```
Rule step shape (extended):
{
  type: "rule",
  id: "strike-roll",
  ritus: "Compendium.my-system.ritus.rFx3kQP2hLmNoStd",  ← NEW optional field
  pool: "@initiator.system.strength",
  on_tier: { ... }
}
```

### D4: dtk.codex-entry is one Item per vocabulary word

The existing `Codex` contract is a single object with categorised arrays (`attributes`, `skills`, etc.). The new `dtk.codex-entry` Item represents a single entry — `name` is the display name, `system.slug` is the expression-language key, `system.description` is the player-facing text. dtk-lex aggregates all discovered entries from a module into a synthetic per-module registry.

This enables: compendium browser as glossary, per-entry permissions, drag-to-chat, and `@UUID[...]` cross-linking from other text fields — none of which are possible with a single monolithic Codex item.

### D5: enrichHTML applied in the Foundry adapter layer

`TextEditor.enrichHTML()` is called by the Foundry adapter that builds the ChatMessage, not by domain code. The `on_tier.message` string travels through the domain as-is; enrichment is an output concern. This keeps the domain free of Foundry globals and makes the enrichment step testable independently.

### D6: Compendium scanning — load on ready, no lazy loading

On `ready`, walk `game.packs` filtered to `{ documentName: "Item", source: { $ne: "world" } }`, call `pack.getDocuments({ type: "dtk.ritus" })` etc. per pack. Store results in registries. No cache invalidation — packs are static for the lifetime of a world session.

Alternative considered: lazy-load on first reference. Rejected — unpredictable timing makes `executeByRef` unreliable before the first roll.

## Module Architecture

```
dtk-alea/src/
├── domain/
│   └── services/
│       └── SequenceExemplarRegistry.ts   ← NEW (pure domain, no Foundry)
├── ports/
│   └── IActorRepository.ts               ← already exists (from dtk-systema)
└── adapters/
    └── foundry/
        ├── RitusDataModel.ts             ← NEW (TypeDataModel wrapper)
        ├── SequenceDataModel.ts          ← NEW (TypeDataModel wrapper)
        ├── CompendiumScanner.ts          ← NEW (scans packs, calls register)
        ├── RitusSheet.ts                 ← NEW (ApplicationV2, lazy factory)
        └── SequenceSheet.ts             ← NEW (ApplicationV2, lazy factory)

dtk-lex/src/
└── adapters/
    └── foundry/
        ├── CodexEntryDataModel.ts        ← NEW (TypeDataModel wrapper)
        ├── CompendiumScanner.ts          ← NEW (scans packs, calls register)
        └── CodexEntrySheet.ts           ← NEW (ApplicationV2, lazy factory)
```

Domain services that map to spec capabilities:

| Spec capability         | Domain service                | Adapter                       |
|------------------------|-------------------------------|-------------------------------|
| compendium-item-types  | —                             | RitusDataModel, SequenceDataModel, CodexEntryDataModel |
| compendium-scanner     | RitusRegistry, SequenceExemplarRegistry, CodexRegistry | CompendiumScanner (×2) |
| execute-by-ref         | SequenceExemplarRegistry, SequenceExecutor | AleaApi.executeByRef  |
| content-enrichment     | —                             | ChatMessage builder           |
| dtk-item-sheets        | —                             | RitusSheet, SequenceSheet, CodexEntrySheet |

## Risks / Trade-offs

[Compendium index timing] Packs may not be fully indexed by `ready`. → Mitigation: call `await pack.getIndex()` before `pack.getDocuments()` in the scanner; log a warning and skip packs that fail to index.

[UUID stability] Authors regenerating `_id` values break cross-pack Ritus references in existing sequences. → Mitigation: document the invariant; the SequenceSheet displays the UUID for reference.

[Performance on large worlds] Loading all DTK items from every enabled module's packs could be slow (many `getDocuments` calls). → Mitigation: filter to `source !== "world"`, batch per pack, log total scan time in debug mode. Profile before optimising.

[Codex category loss] The existing `Codex` contract has categorised arrays (`attributes`, `skills`, `damageTypes`). `dtk.codex-entry` items have no category field in this change. → Mitigation: add optional `system.category` field (string, e.g. `"attribute"`, `"skill"`) so entries can be filtered and grouped in the sheet and expression evaluator. This is additive and non-breaking.

[Ritus UUID vs systemId ambiguity in RollResolver] A step may carry either a `ritus` UUID or rely on `context.systemId`. Resolution order: UUID wins if present; fall back to systemId. → This is explicit in the implementation and logged when systemId fallback is used.

## Open Questions

1. Should `dtk.sequence` items also be discoverable by actors (e.g., dragged onto an actor sheet to grant an action)? — Out of scope for this change; noted for dtk-systema integration.
2. Should the Sequence sheet show a live "test roll" button for GMs? — Deferred; requires actor selection UI.
3. Does dtk-promptuarium's YAML compiler need to output `dtk.ritus`/`dtk.sequence`/`dtk.codex-entry` items, or does it remain a separate Exemplar pipeline? — Separate pipeline; no overlap in this change.
