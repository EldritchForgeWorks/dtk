# Spec: prerequisite-evaluator

The prerequisite evaluator validates whether a build choice or advancement entry's
prerequisites are satisfied. It ships a built-in simple evaluator for common patterns
and delegates complex expressions to dtk-lex when available.

## ADDED Requirements

### Requirement: Built-in simple evaluator for common prerequisite patterns

The built-in evaluator SHALL handle:
- `@steps.{id}.choice == "value"` — step output equality check
- `@steps.{id}.choice != "value"` — step output inequality check
- `@steps.{id}.choice == <number>` — numeric equality
- `@build.advancements.includes("id")` — advancement ownership check
- `&&` and `||` composition of the above forms

Any expression not matching these patterns is passed to the Lex delegate (if present)
or treated as always satisfied (if absent).

#### Scenario: Step equality prerequisite satisfied

- **WHEN** prerequisite is `"@steps.archetype.choice == 'street-samurai'"` and the build has that choice
- **THEN** `evaluate()` returns `true`

#### Scenario: Step equality prerequisite not satisfied

- **WHEN** prerequisite is `"@steps.archetype.choice == 'street-samurai'"` but choice is `"face"`
- **THEN** `evaluate()` returns `false`

#### Scenario: Advancement ownership prerequisite satisfied

- **WHEN** prerequisite is `"@build.advancements.includes('street-cred')"` and the advancement is purchased
- **THEN** `evaluate()` returns `true`

#### Scenario: AND composition requires both conditions true

- **WHEN** prerequisite is `"@steps.archetype.choice == 'street-samurai' && @steps.metatype.choice == 'elf'"`
- **THEN** `evaluate()` returns `true` only when both conditions hold

---

### Requirement: Lex delegation for complex prerequisites

The evaluator SHALL call `ILexDelegate.evaluate(expr, context)` for prerequisite expressions beyond its built-in capability (function calls, comparisons, custom lookups).
If the delegate returns a non-null value, that value is coerced to boolean. If the
delegate returns null, the prerequisite is treated as satisfied with a console warning.

#### Scenario: Complex expression delegated to Lex

- **WHEN** prerequisite is `"floor(@steps.attributes.body / 2) >= 3"` and dtk-lex is installed
- **THEN** `ILexDelegate.evaluate()` is called; its boolean result is returned

#### Scenario: Complex expression without Lex treated as satisfied

- **WHEN** a complex prerequisite exists and `ILexDelegate` is null (dtk-lex absent)
- **THEN** `evaluate()` returns `true`; a console warning names the unevaluated expression

#### Scenario: Lex returns null treats prerequisite as satisfied

- **WHEN** `ILexDelegate.evaluate()` returns null (expression resolution failure)
- **THEN** `evaluate()` returns `true`; a console warning is emitted

---

### Requirement: Prerequisite evaluation is pure

Evaluating prerequisites SHALL NOT modify the `CharacterBuild`, the `FormaRegistry`,
or any Foundry Document. It is a pure read operation.

#### Scenario: Build unchanged after prerequisite check

- **WHEN** `PrerequisiteEvaluator.evaluate()` is called with a build context
- **THEN** the build object is unchanged after the call

---

### Requirement: Bulk prerequisite evaluation for advancement list

`PrerequisiteEvaluator.evaluateAll()` SHALL evaluate all advancement prerequisite expressions and return a `Record<advancementId, boolean>` map used by the tracker to determine which advancements to show. Full signature: `evaluateAll(forma: Forma, build: CharacterBuild): Record<string, boolean>`.

#### Scenario: All advancements evaluated in bulk

- **WHEN** a Forma has five advancement entries and `evaluateAll()` is called
- **THEN** a record with five entries is returned

#### Scenario: Failed evaluation in bulk does not abort remaining evaluations

- **WHEN** one of five prerequisites fails to evaluate (null result from Lex)
- **THEN** that entry is `true` (treated as satisfied); the other four evaluate normally
