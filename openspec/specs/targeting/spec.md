# targeting Specification

## Purpose
TBD - created by archiving change dtk-systema. Update Purpose after archive.
## Requirements
### Requirement: Targeting dispatches by mode

When an action is clicked, systema SHALL read the action's `targeting.mode` and
dispatch to the appropriate targeting handler. All handlers resolve to a
`ResolvedTarget[]` and return a `Promise` that resolves when targeting is complete or
rejects when the user cancels.

`ResolvedTarget` = `{ actorId: string, tokenId: string }`.

#### Scenario: Mode determines targeting handler

- **WHEN** an action declares `targeting: { mode: "token" }`
- **THEN** the token-selection targeting handler is invoked

#### Scenario: Cancel rejects the targeting promise

- **WHEN** the user presses Escape during token targeting
- **THEN** the targeting promise rejects and the action menu returns to its idle state

---

### Requirement: Token mode — canvas selection with min/max/filter

For `mode: "token"`, systema SHALL enter a canvas targeting state where the player
clicks tokens to select them. The state SHALL enforce:
- `min` — the "confirm" button is disabled until at least `min` tokens are selected (default: 1)
- `max` — selecting beyond `max` tokens is prevented; the oldest selection is dropped
- `filter` — tokens that do not satisfy the filter expression are not selectable
  (rendered with a visual indicator); filter evaluated per-token using the inline
  evaluator or dtk-lex

A "Confirm targets" UI element (floating button or HUD overlay) SHALL appear during
selection. Pressing Escape or clicking the cancel affordance rejects the promise.

#### Scenario: Confirm disabled until min tokens selected

- **WHEN** `targeting: { mode: "token", min: 2 }` and only one token is selected
- **THEN** the confirm button is disabled

#### Scenario: max tokens enforced

- **WHEN** `targeting: { mode: "token", max: 1 }` and a second token is clicked
- **THEN** the first selection is deselected and replaced by the second

#### Scenario: Filter prevents selection of matching tokens

- **WHEN** `filter: "@token.disposition == 'friendly'"` is set and a hostile token is clicked
- **THEN** the click is ignored; the token is rendered with a "not selectable" indicator

#### Scenario: Confirm resolves with selected tokens

- **WHEN** the player selects two valid tokens and clicks confirm (min: 1, max: 3)
- **THEN** the targeting promise resolves with an array of two `ResolvedTarget` objects

---

### Requirement: Self mode — no UI, auto-resolves

For `mode: "self"`, targeting SHALL resolve immediately to
`[{ actorId: initiator.id, tokenId: initiatingToken.id }]` with no canvas interaction
and no UI. The targeting promise resolves synchronously (or on the next microtask).

#### Scenario: Self mode resolves to initiator without UI

- **WHEN** an action with `targeting: { mode: "self" }` is clicked
- **THEN** the targeting promise resolves immediately with the actor's own token as the sole target

---

### Requirement: Area mode — MeasuredTemplate placement

For `mode: "area"`, systema SHALL create a Foundry `MeasuredTemplate` document using
`shape`, `size`, and optional `width` from the targeting spec. The player positions
and confirms the template on the canvas. On confirmation, systema collects all tokens
within the template bounds and resolves to their `ResolvedTarget` entries. The template
is deleted after target collection (or on cancel).

#### Scenario: Template created with correct shape and size

- **WHEN** `targeting: { mode: "area", shape: "cone", size: 6 }` is declared
- **THEN** a cone MeasuredTemplate of size 6 grid units is placed for the player to position

#### Scenario: Template deleted after target collection

- **WHEN** the player confirms the template position
- **THEN** systema collects targets, deletes the template document, and resolves the promise

#### Scenario: Template deleted on cancel

- **WHEN** the player presses Escape during template placement
- **THEN** the template document is deleted and the targeting promise rejects

---

### Requirement: None mode — empty target list

For `mode: "none"`, targeting SHALL resolve immediately to `[]` (empty array) with no
canvas interaction.

#### Scenario: None mode resolves to empty array

- **WHEN** an action with `targeting: { mode: "none" }` is clicked
- **THEN** the targeting promise resolves immediately with an empty `ResolvedTarget` array

---

### Requirement: per-target vs once execution dispatch

After resolving targets, systema SHALL check the action's `targeting.execution` field
(applies to `mode: "token"` only):
- `"per-target"` (default): systema calls dtk-alea once per resolved target, passing
  each target's context separately. Executions are sequential, not parallel.
- `"once"`: systema calls dtk-alea once with the full target list in context.

#### Scenario: per-target calls dtk-alea once per token

- **WHEN** two tokens are selected and `execution: "per-target"` is set
- **THEN** dtk-alea is called twice, each call with one target in context

#### Scenario: once calls dtk-alea a single time

- **WHEN** two tokens are selected and `execution: "once"` is set
- **THEN** dtk-alea is called once with both targets in context

