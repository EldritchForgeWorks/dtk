# combat-integration Specification

## Purpose
TBD - created by archiving change dtk-alea. Update Purpose after archive.
## Requirements
### Requirement: combatTurn hook triggers queued sequence execution

dtk-alea SHALL register `Hooks.on('combatTurn', handler)`. When a combatant's turn
begins, the handler SHALL check `Combat.flags['dtk-alea']` for an entry keyed by the
combatant's actor id with `status: "queued"`. If found, it SHALL call
`AleaApi.execute()` with the stored context. If no queued entry is found, it no-ops.

#### Scenario: Queued sequence auto-executes on combatant turn

- **WHEN** a combatant's turn starts and their actor has a queued sequence in Combat flags
- **THEN** `SequenceExecutor` is invoked with the queued context

#### Scenario: No queued sequence is a no-op

- **WHEN** a combatant's turn starts and no queued entry exists in flags
- **THEN** nothing happens; no error

#### Scenario: In-progress (suspended) sequence is not re-triggered

- **WHEN** a combatant's turn starts and their flags entry has `status: "suspended"` (not "queued")
- **THEN** the hook handler does not re-trigger execution

---

### Requirement: Foundry combat classes are not replaced

dtk-alea SHALL NOT subclass `Combat`, `Combatant`, `CombatTracker`, or any other
Foundry combat class. It SHALL NOT unregister or override any of Foundry's default
combat hooks. All integration is additive (additional `Hooks.on` listeners only).

#### Scenario: Foundry CombatTracker renders normally with dtk-alea installed

- **WHEN** dtk-alea is installed and active
- **THEN** Foundry's default CombatTracker UI renders without modification

---

### Requirement: State cleared on combat round advance

dtk-alea SHALL register `Hooks.on('combatRound', handler)`. On round advance, it
SHALL delete any `status: "queued"` entries from `Combat.flags['dtk-alea']`. Suspended
entries (mid-sequence awaits) SHALL NOT be cleared — the player may still be deciding.

#### Scenario: Queued entries cleared on new round

- **WHEN** the combat round advances
- **THEN** all `status: "queued"` entries are removed from `Combat.flags['dtk-alea']`

#### Scenario: Suspended entries survive round advance

- **WHEN** the combat round advances while a sequence is suspended at an await step
- **THEN** the suspended entry remains in flags; the await dialog remains open

---

### Requirement: AleaApi registration with game.dtk

On `init`, dtk-alea SHALL call `game.dtk.register({ id: 'dtk-alea', version, api })`.
The `api` object SHALL implement `AleaApi` from `@eldritchforgeworks/dtk-types/apis` (`registerRitus`,
`execute`, `resume`, `isReady`). On async init completion, dtk-alea SHALL fire
`Hooks.callAll('dtk-alea.ready')`.

#### Scenario: AleaApi accessible via game.dtk after init

- **WHEN** dtk-alea's `init` hook has fired
- **THEN** `game.dtk.api<AleaApi>('dtk-alea')?.registerRitus` is callable

#### Scenario: dtk-alea.ready fires after registration completes

- **WHEN** all registration steps complete
- **THEN** `Hooks.callAll('dtk-alea.ready')` is emitted

