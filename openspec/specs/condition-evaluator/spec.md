# condition-evaluator Specification

## Purpose
TBD - created by archiving change dtk-lex. Update Purpose after archive.
## Requirements
### Requirement: Condition definition in Codex entries

The `condition` field in a `CodexEntry` SHALL be a boolean expression string used by `ConditionEvaluator.evaluate()`. When present, the entry is a **condition definition**. The field is optional — most Codex entries are attribute/skill definitions without it.

#### Scenario: Codex entry with condition field registers as evaluable condition

- **WHEN** `{ slug: "flanked", displayName: "Flanked", condition: "@combat.flanked == true" }` is registered
- **THEN** `ConditionEvaluator.isCondition("sr5e", "flanked")` returns `true`

#### Scenario: Codex entry without condition field is not evaluable as condition

- **WHEN** `{ slug: "agility", displayName: "Agility" }` is registered (no `condition` field)
- **THEN** `ConditionEvaluator.isCondition("sr5e", "agility")` returns `false`

---

### Requirement: Condition evaluation against ExpressionContext

`ConditionEvaluator.evaluate()` SHALL look up the condition expression from `CodexRegistry`, evaluate it via `ExpressionEngine.evaluate()`, and coerce the result to boolean (`!!result`). Full signature: `evaluate(systemId: string, conditionId: string, context: ExpressionContext): boolean`.

Returns `false` and logs a console warning if:
- `conditionId` is not registered for the system
- `conditionId` is registered but has no `condition` expression
- The expression evaluates to `null`

#### Scenario: Condition expression evaluates to true

- **WHEN** `"prone"` condition is defined as `"@actor.conditions.prone == true"` and the actor has `conditions.prone = true`
- **THEN** `evaluate("sr5e", "prone", context)` returns `true`

#### Scenario: Condition expression evaluates to false

- **WHEN** the same context has `conditions.prone = false`
- **THEN** `evaluate("sr5e", "prone", context)` returns `false`

#### Scenario: Unknown condition returns false with warning

- **WHEN** `evaluate("sr5e", "invisible", context)` is called and `"invisible"` is not registered
- **THEN** `false` is returned; a console warning names `"invisible"` as unknown

#### Scenario: Null expression result treated as false

- **WHEN** the condition expression references a missing context field and evaluates to `null`
- **THEN** `false` is returned; a console warning is emitted

---

### Requirement: Batch condition evaluation

`ConditionEvaluator.evaluateAll()` SHALL evaluate all registered conditions for the system and return a `conditionId → boolean` map. Full signature: `evaluateAll(systemId: string, context: ExpressionContext): Record<string, boolean>`. Conditions that error or resolve to null are recorded as `false`.

#### Scenario: All conditions evaluated in a single call

- **WHEN** three conditions are registered for `"sr5e"` and `evaluateAll("sr5e", context)` is called
- **THEN** a record with three entries is returned

#### Scenario: Failed condition does not abort batch evaluation

- **WHEN** one of three conditions references an undefined context path
- **THEN** that condition records `false`; the other two evaluate normally

---

### Requirement: Condition evaluation is side-effect free

Evaluating conditions SHALL NOT modify the `ExpressionContext`, the `CodexRegistry`,
or any Foundry Document. It is a pure read operation — safe to call speculatively
during UI rendering.

#### Scenario: Context unchanged after evaluation

- **WHEN** `ConditionEvaluator.evaluate()` is called with a context object
- **THEN** the context object is unchanged after the call (deep equal to its pre-call state)

