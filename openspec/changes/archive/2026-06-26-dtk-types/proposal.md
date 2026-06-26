# Proposal: @dtk/types

## Why

Every DTK module (dtk-alea, dtk-lex, dtk-opus, dtk-systema, dtk-promptuarium) needs
to agree on the shape of the contracts a game system authors — Ritus, Codex, Forma,
Modus, and Exemplar. Without a shared package, each module would define its own type
stubs, creating duplication, drift, and circular dependency risk. `@dtk/types` is the
single source of truth: the canonical TypeScript contracts, Zod validators, and runtime
type guards the entire ecosystem is built on.

## What Changes

This is a new package — nothing exists yet. It introduces:

- **TypeScript interfaces and types** for all five system-author contracts (Ritus, Codex,
  Forma, Modus, Exemplar) plus the grant model used by Exemplar
- **Zod schemas** for each contract, enabling runtime validation of game system
  registrations at Foundry's `init` hook rather than at player-time
- **Type guard functions** for runtime narrowing across all contract types
- **Inter-module API surface types** describing the public APIs that dtk-alea, dtk-lex,
  dtk-opus, and dtk-systema expose at `game.modules.get('dtk-*').api`
- **Package infrastructure**: private-scoped npm package (`@dtk/types`), tree-shakeable
  exports, no runtime Foundry dependency (pure TypeScript / Zod)

## Capabilities

### New Capabilities

- `ritus`: The Ritus contract — dice mechanics definition consumed by dtk-alea.
  Covers pipeline stage declarations, mechanic type enumeration, roll schema definitions,
  automation hooks, and Ritus-level Zod validator + type guard.

- `codex`: The Codex contract — vocabulary plugin consumed by dtk-lex. Covers
  attribute slugs, skill slugs, derived-stat slugs, damage type slugs, currency slugs,
  and Codex-level Zod validator + type guard.

- `forma`: The Forma contract — character generation wizard definition consumed by
  dtk-opus. Covers step model, field type union, condition language types, output mapper
  type, and Forma-level Zod validator + type guard.

- `modus`: The Modus contract — system wiring descriptor consumed by dtk-systema.
  Covers actor type configs, item type configs, setting declarations, schema version,
  status effects, initiative, and Modus-level Zod validator + type guard.

- `exemplar`: The Exemplar contract — YAML compendium content definition consumed by
  dtk-promptuarium. Covers the base Exemplar envelope, the Grant model (modifier /
  reference / choice with `resolveAt`), and all kind-discriminated schemas (species,
  class-layer tiers, items, backgrounds, origins, features). Includes Exemplar-level
  Zod validators and type guards.

- `module-api-surfaces`: The runtime API types each DTK module exposes via
  `game.modules.get('dtk-*').api`. Covers AleaApi, LexApi, OpusApi, SystemaApi,
  and PromptariumApi. These are TypeScript interface declarations only (no runtime
  Foundry coupling). Includes type guard helpers for checking whether a DTK module
  is installed and its API is available.

### Modified Capabilities

_(None — this is a new package.)_

## Impact

- **All DTK modules** will add `@dtk/types` as a `devDependency`. No runtime bundle
  impact — types are erased at compile time; Zod validators are imported only where
  validation is performed (dtk-systema's `defineSystem()` call site).
- **Game system authors** gain IDE autocomplete and compile-time checking on their
  Ritus, Codex, Forma, Modus, and Exemplar definitions at no runtime cost.
- **No Foundry dependency** in `@dtk/types` — the package is pure TypeScript + Zod,
  importable in Node.js build tools (e.g., dtk-promptuarium's CLI compiler) as well
  as browser bundles.
- **Private registry** — not published to npm public registry. DTK module authors
  access it via the private scoped registry configured in each module's `.npmrc`.
