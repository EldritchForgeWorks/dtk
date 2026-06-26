# advancement-tracker Specification

## Purpose
TBD - created by archiving change dtk-opus. Update Purpose after archive.
## Requirements
### Requirement: Tracker opened via OpusApi.openAdvancementTracker()

`OpusApi.openAdvancementTracker(actor: Actor): void` SHALL read the actor's
`CharacterBuild` from `actor.flags['dtk-opus'].build`, look up the registered Forma
for `build.systemId`, and open the advancement tracker panel. Throws if no build is
found on the actor or no Forma is registered for the build's systemId.

#### Scenario: Tracker opens for actor with existing build

- **WHEN** an actor has `flags['dtk-opus'].build` with a valid `systemId`
- **THEN** the advancement tracker panel opens showing that actor's available advancements

#### Scenario: Tracker throws for actor with no build

- **WHEN** `openAdvancementTracker(actor)` is called on an actor with no `dtk-opus` build flag
- **THEN** a descriptive error is thrown

---

### Requirement: Available advancements filtered by prerequisites and unlock state

The tracker SHALL display advancements from the Forma's `advancementTracks[]`. Each
advancement entry is shown only if:
1. Its `unlocks_after` step id (if present) has been completed in the actor's build
2. Its prerequisite expression (if present) evaluates to `true` via `PrerequisiteEvaluator`

Advancements already purchased by the actor (listed in `build.advancements`) SHALL
be displayed as "Purchased" (greyed out, not hidden).

#### Scenario: Advancement hidden until unlock step is complete

- **WHEN** an advancement has `unlocks_after: "archetype"` and the actor's build has no `archetype` step output
- **THEN** the advancement is not shown in the tracker

#### Scenario: Advancement shown when unlock step complete and prerequisite met

- **WHEN** `unlocks_after` step is complete AND the prerequisite expression is satisfied
- **THEN** the advancement card is visible with a Buy button

#### Scenario: Already-purchased advancement shown as Purchased

- **WHEN** `"enhanced-strength"` is in `build.advancements`
- **THEN** the card is shown with status "Purchased" and the Buy button is absent

---

### Requirement: Paradigm gate — advancement availability per paradigm

The Buy button SHALL be gated by the Forma's declared `advancement.paradigm`. The engine
determines "can buy" differently per paradigm:

| Paradigm | Gate condition |
|----------|---------------|
| `xp` | `paradigmState.total - paradigmState.spent ≥ advancement.cost` |
| `milestone` | `paradigmState.advancementsRemaining > 0` |
| `resource` | Live actor field `@actor.system.{resource}` ≥ `advancement.cost` |
| `practice` | `paradigmState.practiceLog[advancementId] ≥ 1` AND session-end check passed |
| `marks` | `paradigmState.total - paradigmState.spent ≥ advancement.cost` |
| `session` | `paradigmState.advancementsRemaining > 0` |

#### Scenario: XP paradigm — Buy gated on unspent XP

- **WHEN** paradigm is `xp`, the actor has 10 XP remaining, and an advancement costs 5
- **THEN** the Buy button is enabled

#### Scenario: Milestone paradigm — Buy gated on remaining milestone grants

- **WHEN** paradigm is `milestone` and `advancementsRemaining = 0`
- **THEN** all Buy buttons are disabled until a milestone is triggered

#### Scenario: Resource paradigm — Buy gated on live actor field value

- **WHEN** paradigm is `resource`, `resource = "@actor.system.wealth.gold"` evaluates to 50, and advancement costs 30
- **THEN** the Buy button is enabled; purchase deducts 30 gold via `Actor#update`

#### Scenario: Practice paradigm — Buy available after session-end improvement check passes

- **WHEN** paradigm is `practice` and an ability's `practiceLog` count meets `check_expression`
- **THEN** that ability's advancement card shows a Buy button after session end

#### Scenario: Marks paradigm — Buy gated on unspent marks

- **WHEN** paradigm is `marks` and `paradigmState.total - paradigmState.spent ≥ cost`
- **THEN** the Buy button is enabled

#### Scenario: Session paradigm — Buy gated on advancementsRemaining

- **WHEN** paradigm is `session` and `advancementsRemaining = 2`
- **THEN** two advancements may be purchased before the next session increment

---

### Requirement: Buy action records purchase and updates paradigm state

Clicking Buy SHALL:
1. Verify the gate condition for the active paradigm
2. Verify the advancement is not already purchased
3. Add the advancement id to `build.advancements` with the current timestamp
4. Update `build.paradigmState` to reflect the purchase (deduct spent units, decrement remaining, etc.)
5. For `resource` paradigm: update the actor's live resource field via `Actor#update`
6. Persist the updated `CharacterBuild` to `actor.flags['dtk-opus'].build` via `Actor#update`
7. Refresh the tracker panel

#### Scenario: Buy records advancement and updates paradigm state

- **WHEN** the player buys an advancement costing 5 XP and has 15 XP remaining
- **THEN** `build.advancements` includes the new entry; `paradigmState.spent` increases by 5; panel refreshes

#### Scenario: Buy blocked when gate condition not met

- **WHEN** the gate condition is not satisfied (insufficient XP/marks/grants/resource)
- **THEN** the Buy button is disabled; no flag update occurs

#### Scenario: Buy is idempotent — purchased advancement cannot be re-purchased

- **WHEN** `"enhanced-strength"` is already in `build.advancements` and Buy is clicked
- **THEN** nothing happens; `build.advancements` is unchanged

---

### Requirement: Paradigm state summary displayed in tracker header

The tracker header SHALL display a paradigm-appropriate currency summary:
- `xp`/`marks`: `"{currency} Spent: {spent} / {total}"`
- `milestone`/`session`: `"Advancements Available: {remaining}"`
- `resource`: `"{currency}: {liveValue}"` (evaluated live from actor field)
- `practice`: `"Session Practice Log: {practisedCount} abilities marked"`

#### Scenario: XP summary shows correct totals

- **WHEN** paradigm is `xp` with currency `"Karma"`, `spent = 15`, `total = 50`
- **THEN** the header shows `"Karma Spent: 15 / 50"`

#### Scenario: Milestone summary shows remaining grants

- **WHEN** paradigm is `milestone` with `advancementsRemaining = 2`
- **THEN** the header shows `"Advancements Available: 2"`

#### Scenario: Summary updates after purchase

- **WHEN** any paradigm's purchase completes
- **THEN** the header summary updates to reflect the new state

