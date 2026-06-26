# action-menu Specification

## Purpose
TBD - created by archiving change dtk-systema. Update Purpose after archive.
## Requirements
### Requirement: Action menu opens on token control

dtk-systema SHALL register a `Hooks.on('controlToken', ...)` listener. When a token
belonging to a DTK-managed actor is controlled, the action menu SHALL open as a
floating `ApplicationV2` panel. When the token is deselected or a different
non-DTK token is controlled, the menu SHALL close. Controlling a second DTK token
while the menu is open SHALL replace the menu's content with the new token's actions.

#### Scenario: Menu opens when DTK actor token is controlled

- **WHEN** a player controls a token whose actor was registered via `defineSystem`
- **THEN** the action menu ApplicationV2 panel opens adjacent to the token

#### Scenario: Menu closes on deselect

- **WHEN** the player clicks an empty canvas area, deselecting the token
- **THEN** the action menu closes

#### Scenario: Non-DTK token does not open menu

- **WHEN** a player controls a token belonging to a non-DTK actor (e.g., a vanilla NPC)
- **THEN** the action menu does not open

---

### Requirement: Actions sourced from actor's resolved Exemplar grants

The action menu SHALL read the actor's resolved action list from
`actor.flags['dtk-systema'].actions` — an array of `kind: "action"` Exemplar ids
populated by dtk-promptuarium at character creation/advancement time. Systema fetches
the full Exemplar data from the world compendium index at menu open time. Actions are
NOT queried from the compendium on every render; they are indexed on open only.

#### Scenario: Menu displays actions from actor flags

- **WHEN** an actor's `flags['dtk-systema'].actions` contains `["ranged-attack", "dodge"]`
- **THEN** the action menu renders entries for both actions

#### Scenario: Empty action list renders empty-state message

- **WHEN** an actor's `flags['dtk-systema'].actions` is empty or absent
- **THEN** the menu renders a "No actions available" placeholder instead of a blank panel

---

### Requirement: Condition evaluation — available vs. greyed

For each action Exemplar, the menu SHALL evaluate the action's `condition` field (if
present) against the actor's current state. If the condition evaluates to `false`, the
action SHALL be rendered greyed and disabled (not hidden). If `true` or absent, the
action is active and clickable.

Condition evaluation SHALL use a minimal inline evaluator supporting simple field
lookups (`@actor.{field}`, comparison operators, numeric literals). When dtk-lex is
installed, systema SHALL delegate all condition evaluation to `LexApi.evaluate()`.
When a condition is too complex for the inline evaluator and dtk-lex is absent, the
action SHALL default to available (fail-open) with a console warning.

#### Scenario: Action with true condition renders active

- **WHEN** action `condition: { field: "@actor.ammo", op: "gt", value: 0 }` evaluates true
- **THEN** the action entry is clickable

#### Scenario: Action with false condition renders greyed

- **WHEN** action `condition: { field: "@actor.ammo", op: "gt", value: 0 }` evaluates false (ammo is 0)
- **THEN** the action entry is rendered greyed and its click handler is disabled

#### Scenario: Action without condition always renders active

- **WHEN** an action Exemplar has no `condition` field
- **THEN** the action entry is always rendered as available

---

### Requirement: Action click triggers execution pipeline

Clicking an active (non-greyed) action entry SHALL initiate the execution pipeline:
targeting → context building → dtk-alea execution. The menu SHALL enter a "pending"
visual state (spinner on the clicked action) while the pipeline runs. The menu SHALL
re-enable on pipeline completion or error. Clicking a second action while one is
pending SHALL be a no-op.

#### Scenario: Click initiates targeting for token-mode action

- **WHEN** a player clicks an action with `targeting: { mode: "token" }`
- **THEN** the targeting workflow begins (canvas enters token-selection mode)

#### Scenario: Click immediately executes self-targeting action

- **WHEN** a player clicks an action with `targeting: { mode: "self" }`
- **THEN** targeting resolves instantly to the actor's own token and execution proceeds

#### Scenario: Second click while pending is ignored

- **WHEN** a pipeline is in progress and the player clicks another action
- **THEN** the click is ignored; the in-progress pipeline continues unaffected

---

### Requirement: ApplicationV2 implementation

The action menu SHALL be implemented as an `ApplicationV2` class with
`HandlebarsApplicationMixin`, rendering `templates/action-menu.hbs`. It SHALL NOT use
JQuery or legacy `Application`. The panel SHALL be non-modal and positioned relative
to the token's canvas position, adjusting on token movement. It SHALL be re-renderable
without closing (for condition re-evaluation after actor updates).

#### Scenario: Menu re-renders on actor update without closing

- **WHEN** an actor's `system.ammo` changes (e.g., after firing a weapon)
- **THEN** the action menu re-evaluates conditions and re-renders in place without closing

