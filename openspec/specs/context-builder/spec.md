# context-builder Specification

## Purpose
TBD - created by archiving change dtk-systema. Update Purpose after archive.
## Requirements
### Requirement: RollContext assembled from Foundry documents

The context builder SHALL produce a `RollContext` conforming to the `RollContext`
interface declared in `@eldritchforgeworks/dtk-types/apis`. The object SHALL include:

- `initiator` — `{ actorId, tokenId, system: actor.system }` for the actor who
  triggered the action
- `targets` — the `ResolvedTarget[]` resolved by the targeting workflow; each entry
  augmented with `system: targetActor.system`
- `item` — `{ itemId, system: item.system }` if the action was triggered from an item
  context (e.g., weapon attack); `null` otherwise
- `combat` — `{ round, turn, combatantId }` from `game.combat?.current`; `null` when
  no active combat
- `stepInputs` — `Record<string, unknown>` of `@steps.{id}.{field}` values passed in
  from prior sequence steps (populated by the await relay payload); empty object when
  starting a fresh sequence
- `actionId` — the `kind: "action"` Exemplar id that triggered this execution
- `sequenceId` — the `kind: "sequence"` Exemplar id the action references

#### Scenario: Context assembled with full combat state

- **WHEN** an action is executed during an active combat and targets have been resolved
- **THEN** `context.combat` contains the current round, turn, and combatant id

#### Scenario: Context assembled outside combat

- **WHEN** an action is executed outside any active combat encounter
- **THEN** `context.combat` is `null`

#### Scenario: Context includes target system data

- **WHEN** two targets are resolved by the targeting workflow
- **THEN** `context.targets` contains two entries each with their actor's `system` data

---

### Requirement: Context validation before dtk-alea handoff

The assembled `RollContext` SHALL be validated against the `RollContext` Zod schema
(or interface check) from `@eldritchforgeworks/dtk-types/apis` before `AleaApi.execute()` is called.
If validation fails, systema SHALL surface a Foundry error notification with the
validation message and halt execution without calling dtk-alea.

#### Scenario: Valid context proceeds to dtk-alea

- **WHEN** a valid RollContext is assembled
- **THEN** `AleaApi.execute(context)` is called

#### Scenario: Invalid context surfaces notification and halts

- **WHEN** the assembled context is missing a required field (e.g., initiator is null)
- **THEN** a Foundry error notification is shown and dtk-alea is not called

---

### Requirement: stepInputs populated from await relay payload

The context builder SHALL merge prior step outputs into `context.stepInputs` when a sequence is resumed after an await step. dtk-alea passes back a `stepOutputs` record in the resume payload; the context builder merges these so that subsequent steps can reference `@steps.{id}.{field}` cross-step values.

#### Scenario: Prior step outputs flow into subsequent context

- **WHEN** a sequence resumes after an await step and dtk-alea provides stepOutputs
- **THEN** `context.stepInputs` contains the prior step field values

---

### Requirement: dtk-alea absent halts execution gracefully

The context builder SHALL surface a Foundry warning notification and halt execution without error when dtk-alea is not installed (`game.dtk.api('dtk-alea')` returns `undefined`). The warning message SHALL be: "dtk-alea is required to execute actions — please install it via the DTK Hub."

#### Scenario: Missing dtk-alea surfaces warning

- **WHEN** an action is triggered and dtk-alea is not installed
- **THEN** a Foundry warning notification is shown and no execution occurs

