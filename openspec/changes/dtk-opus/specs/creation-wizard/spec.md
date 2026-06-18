# Spec: creation-wizard

The creation wizard is a multi-step ApplicationV2 modal that walks the player through
character creation as defined by the registered Forma schema.

## ADDED Requirements

### Requirement: Wizard opened via OpusApi.openCreationWizard()

`OpusApi.openCreationWizard(actor: Actor, systemId: string): Promise<CharacterBuild | null>`
SHALL look up the registered Forma for `systemId`, open the creation wizard UI, and
resolve the Promise when the player completes (returns `CharacterBuild`) or cancels
(returns `null`). Throws if no Forma is registered for the system.

#### Scenario: Wizard resolves with CharacterBuild on completion

- **WHEN** the player completes all required steps and clicks Finish
- **THEN** the Promise resolves with a `CharacterBuild` containing all step choices

#### Scenario: Wizard resolves with null on cancel

- **WHEN** the player clicks Cancel on any step
- **THEN** the Promise resolves with `null`; no changes written to actor flags

#### Scenario: openCreationWizard throws for unregistered system

- **WHEN** `openCreationWizard(actor, "unregistered-system")` is called
- **THEN** a descriptive error is thrown identifying the unregistered system

---

### Requirement: Steps rendered in Forma declaration order

The wizard SHALL render one page per step in `forma.steps[]`, in declaration order.
The player navigates via Previous / Next buttons. The Finish button is enabled only
when all required steps have a valid selection.

#### Scenario: Steps appear in declaration order

- **WHEN** the Forma declares steps `["metatype", "archetype", "attributes"]`
- **THEN** the wizard shows step pages in that order

#### Scenario: Finish button disabled until all required steps are complete

- **WHEN** the player is on step 2 and step 1 has no selection
- **THEN** the Finish button is disabled

#### Scenario: Finish button enabled when all required steps have a selection

- **WHEN** all required steps have a valid selection
- **THEN** the Finish button is enabled

---

### Requirement: Choice step rendered as card grid

Steps with `choices: { from: string, max: number }` SHALL be rendered as a grid of
Exemplar cards. Cards are populated by querying `IExemplarQuery.query(kind)`. Selecting
a card records the Exemplar id in the current step's output. When `max > 1`, multiple
cards may be selected up to the limit.

#### Scenario: Card grid populated from exemplar query

- **WHEN** step has `choices: { from: "species", max: 1 }` and query returns 4 species Exemplars
- **THEN** 4 cards are rendered in the grid

#### Scenario: Selecting a card records choice

- **WHEN** the player clicks the `"elf"` species card
- **THEN** `stepOutputs["metatype"] = "elf"` is recorded in the in-progress build

#### Scenario: Multi-choice step enforces max

- **WHEN** step has `max: 2` and 2 cards are already selected
- **THEN** a third card cannot be selected (click is a no-op or shows visual feedback)

---

### Requirement: Point-buy step rendered as allocator

Steps with `spend_on: "attributes"` SHALL render a list of attributes from the Codex
(via dtk-lex when available, or from Forma's declared `attributes` list as fallback)
with `+` and `−` buttons. The total points available equals the evaluated `pool`
expression. Points cannot be allocated below each attribute's minimum or above its
maximum (from Forma's attribute constraints). The step is valid when all points are
spent.

#### Scenario: Point-buy shows correct total points

- **WHEN** the Forma's `pool` expression for the attributes step evaluates to `24`
- **THEN** the allocator shows `24 / 24` remaining at the start

#### Scenario: Over-allocation prevented

- **WHEN** all 24 points are spent and the player clicks `+` on an attribute
- **THEN** the click is rejected (button disabled or no-op)

#### Scenario: Step valid only when all points are spent

- **WHEN** 4 points remain unallocated
- **THEN** the step is not considered complete; Finish remains disabled
