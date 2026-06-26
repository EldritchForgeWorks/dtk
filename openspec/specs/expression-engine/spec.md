# expression-engine Specification

## Purpose
TBD - created by archiving change dtk-lex. Update Purpose after archive.
## Requirements
### Requirement: Lexer tokenises expression strings

`Lexer.tokenise(expr: string): Token[]` SHALL produce a token stream from the
expression string. Token types: `NUMBER`, `STRING`, `IDENTIFIER`, `AT_REF`, `OP`,
`LPAREN`, `RPAREN`, `COMMA`, `EOF`. Unrecognised characters SHALL produce a `LEXER_ERROR`
token (not throw) — errors are collected and surfaced by the Parser.

#### Scenario: Arithmetic expression tokenised correctly

- **WHEN** `"@agility + 2"` is tokenised
- **THEN** tokens are `[AT_REF("agility"), OP("+"), NUMBER(2), EOF]`

#### Scenario: Function call tokenised correctly

- **WHEN** `"floor(@strength * 1.5)"` is tokenised
- **THEN** tokens include `IDENTIFIER("floor")`, `LPAREN`, `AT_REF("strength")`, `OP("*")`, `NUMBER(1.5)`, `RPAREN`

#### Scenario: Unrecognised character produces LEXER_ERROR token

- **WHEN** `"@attr ¶ 2"` is tokenised
- **THEN** a `LEXER_ERROR` token is present in the stream

---

### Requirement: Parser produces AST from token stream — no eval()

`Parser.parse(tokens: Token[]): ASTNode` SHALL build an abstract syntax tree using
recursive descent. Precedence order (low to high): conditional (`? :`), logical OR,
logical AND, equality, comparison, addition, multiplication, unary, call/primary.
Parse errors produce a `ParseError` node with a message — the tree is always returned,
never thrown.

#### Scenario: Conditional expression parsed with correct precedence

- **WHEN** `"@cover ? @dice - 2 : @dice"` is parsed
- **THEN** root node is `ConditionalNode` with condition `AT_REF("cover")`, consequent `BinaryNode(-)`, alternate `AT_REF("dice")`

#### Scenario: Operator precedence respected

- **WHEN** `"2 + 3 * 4"` is parsed
- **THEN** root is `BinaryNode(+)` with right child `BinaryNode(*) (3,4)` — multiplication binds tighter

#### Scenario: Parse error node returned for invalid expression

- **WHEN** `"@attr +"` is parsed (incomplete expression)
- **THEN** tree contains a `ParseError` node; no exception is thrown

---

### Requirement: Interpreter evaluates AST against ExpressionContext

`Interpreter.evaluate(ast: ASTNode, context: ExpressionContext): Value` SHALL walk
the AST and return a `Value` (`number | boolean | string | null`). `AT_REF` nodes
resolve via context lookup. Unknown references and `ParseError` nodes resolve to `null`.
Division by zero resolves to `null` with a console warning.

#### Scenario: @-reference resolved from context

- **WHEN** context has `agility = 6` and `AT_REF("agility")` is evaluated
- **THEN** result is `6`

#### Scenario: Conditional evaluates true branch

- **WHEN** `"@prone ? 0 : @pool"` is evaluated with `prone = true`, `pool = 8`
- **THEN** result is `0`

#### Scenario: Unknown reference resolves to null

- **WHEN** `AT_REF("nonexistent")` is evaluated
- **THEN** result is `null`

#### Scenario: ParseError node resolves to null

- **WHEN** an AST containing a `ParseError` node is evaluated
- **THEN** result is `null`; a console warning names the error

---

### Requirement: Built-in function registry

The engine SHALL ship with built-in functions: `floor(x)`, `ceil(x)`, `round(x)`,
`max(a, b)`, `min(a, b)`, `clamp(v, lo, hi)`, `abs(x)`, `if(cond, t, f)`.
Unknown function calls resolve to `null` with a console warning naming the function.

#### Scenario: floor() applied to float

- **WHEN** `"floor(@stat * 1.5)"` evaluates with `stat = 5`
- **THEN** result is `7` (`floor(7.5)`)

#### Scenario: clamp() bounds value

- **WHEN** `"clamp(@net_hits, 0, 4)"` evaluates with `net_hits = 6`
- **THEN** result is `4`

#### Scenario: Unknown function returns null with warning

- **WHEN** `"roll(@pool)"` is evaluated and `roll` is not registered
- **THEN** result is `null`; a console warning names `"roll"` as unknown

---

### Requirement: Custom function registration

`LexApi.registerFunction(name: string, fn: (args: Value[]) => Value)` SHALL add the
function to `FunctionRegistry`. Custom functions override built-ins with a console
warning if the name collides. Functions must be pure — no async, no side effects.

#### Scenario: Custom function callable in expressions

- **WHEN** `LexApi.registerFunction("lookup", (args) => table[args[0]])` is registered
- **THEN** `"lookup(@type)"` evaluates correctly in subsequent expressions

#### Scenario: Custom function overriding built-in warns

- **WHEN** `LexApi.registerFunction("floor", customFloor)` is called
- **THEN** a console warning is logged and `customFloor` replaces the built-in `floor`

