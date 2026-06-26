# Spec: expression-parser

The expression parser evaluates pool strings and formula values from Rule and Sequence
Exemplars. It handles `@scope.path` references and arithmetic. Complex expressions
are delegated to dtk-lex via the `IExpressionDelegate` port.

## ADDED Requirements

### Requirement: @scope.path reference resolution

The parser SHALL resolve references of the form `@{scope}.{dotted.path}` against the
execution context. Supported scopes:

- `@initiator.{path}` — initiator actor's system snapshot
- `@target.{path}` — current target's system snapshot (first target for multi-target)
- `@item.{path}` — active item's system snapshot (null if no item)
- `@combat.{field}` — `round`, `turn`, `combatantId`
- `@steps.{id}.{field}` — output from a prior step in the current sequence

Unknown scope or path resolves to `null`.

#### Scenario: @initiator reference resolves from context

- **WHEN** `@initiator.system.agility` is evaluated and the initiator snapshot has `system.agility = 6`
- **THEN** the expression evaluates to `6`

#### Scenario: @steps cross-step reference resolves

- **WHEN** `@steps.attack-roll.netHits` is evaluated and step `attack-roll` produced `netHits = 3`
- **THEN** the expression evaluates to `3`

#### Scenario: Unknown path resolves to null

- **WHEN** `@initiator.system.nonexistentField` is evaluated
- **THEN** the expression evaluates to `null`

#### Scenario: Skipped step reference resolves to null sentinel

- **WHEN** step `cover-roll` was skipped due to a false condition and `@steps.cover-roll.netHits` is evaluated
- **THEN** the expression evaluates to `null`

---

### Requirement: Arithmetic on resolved values

The parser SHALL evaluate arithmetic expressions composed of `@scope.path` references,
numeric literals, and `+`, `-`, `*`, `/` operators with standard precedence (PEMDAS).
Division by zero SHALL resolve to `null` with a console warning.

#### Scenario: Addition of reference and literal

- **WHEN** `"@agility + 2"` is evaluated with `@agility = 6`
- **THEN** result is `8`

#### Scenario: Multi-operator expression with precedence

- **WHEN** `"@strength * 2 + @skill.melee"` evaluates with strength=4, skill=3
- **THEN** result is `11` (multiplication before addition)

#### Scenario: Division by zero returns null

- **WHEN** `"@pool / 0"` is evaluated
- **THEN** result is `null`; a console warning is emitted

---

### Requirement: Delegation to IExpressionDelegate for complex expressions

The parser SHALL call `IExpressionDelegate.evaluate(expression, context)` for complex expressions it cannot handle natively (conditionals, function calls, logical operators, string operations). If the delegate returns a result,
that result is used. If no delegate is wired (dtk-lex absent), the parser SHALL return
`null` and log a console warning naming the unsupported expression.

#### Scenario: Complex expression delegated to Lex

- **WHEN** `"if(@cover, @dice - 2, @dice)"` is encountered and a delegate is wired
- **THEN** `IExpressionDelegate.evaluate()` is called and its result returned

#### Scenario: Complex expression without delegate returns null

- **WHEN** a conditional expression is encountered and no delegate is wired
- **THEN** `null` is returned and a console warning names the expression

---

### Requirement: Integer coercion for pool expressions

When a pool expression is evaluated for die count, the result SHALL be coerced to a
non-negative integer: `Math.max(0, Math.floor(result))`. Non-numeric results (null,
string, object) SHALL coerce to `0`.

#### Scenario: Float pool coerced to floor integer

- **WHEN** pool expression evaluates to `7.8`
- **THEN** die count = `7`

#### Scenario: Null pool coerced to zero

- **WHEN** pool expression evaluates to `null`
- **THEN** die count = `0`
