## Why

dtk-systema resolves targets and assembles context, but something must actually roll
dice, evaluate the expression pool, classify tiers, chase chains, and emit the result.
dtk-alea is that engine — a pure executor that receives a fully-populated `RollContext`
and runs a sequence of Rule/Sequence Exemplars to completion, emitting Foundry hooks
at each significant event. It has no canvas, no UI, and no sockets.

## What Changes

- Introduces `dtk-alea` as a new Foundry module in an independent repo, free tier
- Provides `AleaApi.execute(context)` — the entry point that runs a sequence
- Provides `AleaApi.resume(sequenceId, choice)` — resumes a suspended sequence after
  a player decision relayed by dtk-systema
- Provides `AleaApi.registerRitus(ritus)` — called by dtk-systema after `defineSystem`
- Owns expression parsing: evaluates `@attr.path` and arithmetic in pool strings;
  delegates complex expressions to dtk-lex (LexApi) when installed
- Owns sequence execution state in `Combat.flags['dtk-alea']` (persisted to Foundry DB)
- Enhances Foundry combat via `Hooks.on('combatTurn')` — never replaces Foundry classes
- Emits `dtk-alea.await`, `dtk-alea.step`, and `dtk-alea.complete` Foundry hooks

## Capabilities

### New Capabilities

- `ritus-registry`: Stores registered Ritus configs; validates them on receipt;
  provides the dice mechanic, threshold, and tier config for a given system id.
- `roll-resolver`: Assembles the dice pool from a pool expression, rolls via
  `Roll` (Foundry) or a test double, counts hits against threshold, computes net
  hits (for opposed rolls), and classifies the result into an outcome tier.
- `expression-parser`: Evaluates `@steps.{id}.{field}`, `@initiator.{field}`,
  `@target.{field}`, `@item.{field}`, `@combat.round` and arithmetic. Delegates to
  `LexApi.evaluate()` when dtk-lex is installed and the expression exceeds inline
  parser capability.
- `sequence-executor`: Walks a Sequence Exemplar's step list; dispatches each step
  to the roll resolver; evaluates step conditions (skip/include); handles `await`
  steps by suspending and emitting `dtk-alea.await`; executes named chains; applies
  on-tier consequences (damage, effect, chat).
- `combat-integration`: Listens to Foundry's `combatTurn` hook; reads the active
  combatant's queued sequence from `Combat.flags['dtk-alea']`; persists mid-sequence
  state; clears state on `combatRound` or manual abort.

### Modified Capabilities

_(none — this change introduces only new capabilities)_

## Impact

- **New Foundry module**: `dtk-alea`, independent repo, free tier
- **Module id**: `dtk-alea`; npm package (if published): `@dtk/alea` (private)
- **Depends on**: `dtk` (hub, for `game.dtk.register()`); `@dtk/types` (devDependency)
- **Optional**: `dtk-lex` — when installed, expression delegation happens automatically
- **Consumed by**: dtk-systema (calls `AleaApi.execute()` and `AleaApi.resume()`);
  every DTK game system indirectly (via systema triggering alea)
- **Foundry integration points**: `Hooks.on('combatTurn')` for combat integration;
  `Combat.flags` for state persistence; `Roll` class for actual dice rolling;
  `Hooks.callAll()` for `dtk-alea.*` event emission
- **Does NOT own**: target selection (dtk-systema), action menu (dtk-systema),
  compendium compilation (dtk-promptuarium), expression DSL authoring (dtk-lex)
