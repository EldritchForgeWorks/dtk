## Why

The `mechanic` field on `RitusConfig` is declared but only `pool-count` behaviour is implemented in `RollResolver` — every other value is silently ignored. The `RitusMechanicSchema` enum in `@eldritchforgeworks/dtk-types` also does not match the mechanic names listed in the ritus spec, and is missing `exploding`, `step-die`, `advantage-disadvantage`, `target-number`, `drama-die`, and `custom`. Without the full mechanic set, dtk-alea cannot support the majority of TTRPG dice systems.

## What Changes

- Align `RitusMechanicSchema` enum in `@eldritchforgeworks/dtk-types` with the ritus spec values: `standard`, `pool-count`, `pool-sum`, `exploding`, `step-die`, `roll-under`, `advantage-disadvantage`, `target-number`, `drama-die`, `custom`
- Add `sides: number` and `explodes: boolean` to `RitusConfig` and `RitusSchema` (encode die type and explosion flag alongside mechanic name) — **BREAKING** for any existing `RitusConfig` objects missing the new required fields
- Extend `IDiceRoller.roll()` with a `RollOpts` argument carrying mechanic-specific options (explodes, keep, dropLowest)
- Implement mechanic-specific resolution branches in `RollResolver`:
  - **pool-count** — existing behaviour, no change
  - **pool-sum** — sum all faces, classify against threshold as a total
  - **roll-under** — count faces strictly below threshold as hits
  - **exploding** — pool-count with re-roll on max face (Foundry `x` modifier); named Fulmen in DTK
  - **step-die** — single die whose size is the `sides` config value; compare face to threshold
  - **advantage-disadvantage** — roll pool twice, keep best (advantage) or worst (disadvantage); pool expresses the advantage count
  - **target-number** — single die plus modifiers vs a fixed target number supplied by the pool expression
  - **drama-die** — symbolic result mapped by face → tier directly (no threshold); tiers are face ranges
  - **standard** and **custom** — treated as `pool-count` fallback; `custom` emits a hook for module override

## Capabilities

### New Capabilities

- `dice-mechanics`: Specification for all supported mechanic variants — inputs, resolution algorithm, outputs, and error behaviour for each named mechanic

### Modified Capabilities

- `ritus`: Enum alignment — add all new mechanic names; add `sides` and `explodes` fields to the Ritus schema
- `roll-resolver`: Mechanic-dispatch — add requirements for per-mechanic resolution branches and the `RollOpts` interface on the port

## Impact

- `@eldritchforgeworks/dtk-types`: `RitusMechanicSchema`, `RitusSchema`, `RitusConfig` — breaking change on schema shape
- `dtk-alea`: `IDiceRoller`, `RollResolver`, `FoundryDiceRoller`, `InMemoryDiceRoller`, `CompendiumScanner` — new branches and interface extension
- `RollResult`: may need a `mechanic` field so subscribers (e.g. dtk-runeforge) can adjust display per mechanic
- Existing ritus compendium packs: must add `sides` and `explodes` fields; old packs without these fields will fail schema validation
