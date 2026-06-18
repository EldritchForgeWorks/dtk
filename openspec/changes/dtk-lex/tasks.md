# Tasks: dtk-lex

## Group 0: Architecture Scaffold

- [ ] [wire] Create hexagonal directory structure: `src/domain/`, `src/ports/`, `src/adapters/foundry/`, `src/adapters/in-memory/`
- [ ] [wire] Configure vitest with `coverage.exclude: ["src/adapters/foundry/**"]` and `coverage.thresholds: { lines: 85 }`
- [ ] [wire] Create `tests/` directory with `fixtures/` and `helpers/` subdirectories
- [ ] [wire] Declare both port interfaces in `src/ports/`: `ICodexStore`, `IEditorRenderer`
- [ ] [wire] Write both in-memory stubs in `src/adapters/in-memory/`: `InMemoryCodexStore`, `NullEditorRenderer`
- [ ] [wire] Create test fixture factory `tests/fixtures/codex.ts` with `makeCodexEntry()`, `makeSr5eCodex()`, `makeConditionEntry()`
- [ ] [wire] Create test fixture factory `tests/fixtures/context.ts` with `makeExpressionContext()` helpers

---

## Group 1: CodexRegistry [codex-registry]

- [ ] [test] Write `CodexRegistry` unit tests covering: valid entries stored by system id, re-registration warns + overwrites, invalid entry throws, known slug resolves, unknown slug returns null, cross-system slug returns null, slugs listed alphabetically, unregistered system list returns empty array, export maps slug to displayName, export for unregistered system returns empty object (4 groups: Boundary/Scenario/Failure/Combinatorial)
- [ ] [impl] Implement `CodexEntry` value object: `{ slug, displayName, description?, condition? }`
- [ ] [impl] Implement `CodexRegistry` domain service: `Map<systemId, Map<slug, CodexEntry>>`; `register(systemId, entries)` validates entries, warns on re-registration; `resolve(systemId, slug): CodexEntry | null`; `listSlugs(systemId): string[]` (sorted); `exportJson(systemId): Record<string, string>`
- [ ] [impl] Implement `LexApi.registerCodex()` and `LexApi.exportCodexJson()` as delegations to `CodexRegistry`
- [ ] [stub] Extend `InMemoryCodexStore` stub to back `CodexRegistry` persistence in tests

---

## Group 2: Lexer & Parser [expression-engine — phase 1]

- [ ] [test] Write `Lexer` unit tests covering: arithmetic expression tokenised, function call tokenised, unrecognised character produces LEXER_ERROR, string literal tokenised, `@scope.path` produces AT_REF token, empty input produces only EOF (4 groups)
- [ ] [impl] Implement `Token` value object and `TokenType` enum
- [ ] [impl] Implement `Lexer.tokenise(expr): Token[]`: character-by-character scanner; produces NUMBER, STRING, IDENTIFIER, AT_REF, OP, LPAREN, RPAREN, COMMA, EOF, LEXER_ERROR
- [ ] [test] Write `Parser` unit tests covering: conditional expression parsed with correct associativity, operator precedence respected, nested parentheses, function call node, binary AND/OR, comparison operators, parse error node returned for incomplete expression (4 groups)
- [ ] [impl] Implement AST node types: `NumberNode`, `StringNode`, `AtRefNode`, `BinaryNode`, `UnaryNode`, `CallNode`, `ConditionalNode`, `ParseError`
- [ ] [impl] Implement `Parser.parse(tokens): ASTNode`: recursive descent; all operator precedence levels; `ParseError` node (no throws)

---

## Group 3: Interpreter & ExpressionEngine [expression-engine — phase 2]

- [ ] [test] Write `Interpreter` unit tests covering: @-reference from context, conditional true/false branch, unknown reference → null, ParseError node → null + warning, division by zero → null + warning, null coercion in arithmetic (4 groups)
- [ ] [impl] Implement `FunctionRegistry` domain service: `Map<name, fn>`; built-in functions (floor, ceil, round, max, min, clamp, abs, if); `register(name, fn)` with collision warning; `call(name, args): Value | null`
- [ ] [impl] Implement `Interpreter.evaluate(ast, context): Value`: AST walker; scope dispatch for AT_REF; arithmetic/logical/comparison/unary/conditional evaluation; delegates to `FunctionRegistry` for calls
- [ ] [impl] Implement `ExpressionEngine.evaluate(expr, context): Value`: orchestrates Lexer → Parser → Interpreter; surface-level entry point
- [ ] [impl] Implement `LexApi.evaluate()`, `LexApi.registerFunction()` as delegations

---

## Group 4: ConditionEvaluator [condition-evaluator]

- [ ] [test] Write `ConditionEvaluator` unit tests covering: entry with condition field registered as evaluable, entry without condition field not evaluable, condition evaluates to true, condition evaluates to false, unknown condition returns false + warning, null result treated as false + warning, batch evaluateAll returns all conditions, failed condition in batch doesn't abort, context unchanged after evaluation (4 groups)
- [ ] [impl] Implement `ConditionEvaluator` domain service: `isCondition(systemId, slug): boolean`; `evaluate(systemId, conditionId, context): boolean`; `evaluateAll(systemId, context): Record<string, boolean>`; delegates to `ExpressionEngine`

---

## Group 5: Foundry Adapters [adapt]

- [ ] [adapt] Implement `FoundryCodexStore`: reads/writes registered Codexes via `game.settings` (world-scope JSON blob); `ICodexStore` port
- [ ] [adapt] Implement `FoundryEditorRenderer`: creates and manages `LexEditorApplication` instance; enforces single-instance invariant; resolves Promise on confirm/cancel; `IEditorRenderer` port

---

## Group 6: Visual Editor ApplicationV2 [visual-editor]

- [ ] [impl] Implement `LexEditorApplication` as `HandlebarsApplicationMixin(ApplicationV2)`: floating non-modal panel; text input; Handlebars template for layout; confirm/cancel buttons
- [ ] [impl] Wire real-time syntax error underline: debounced (300ms) `Lexer → Parser` call on input change; highlight `ParseError` token spans
- [ ] [impl] Wire autocomplete dropdown: trigger on `@` character; query `CodexRegistry.listSlugs(systemId)`; filter on further typing; insert on selection
- [ ] [impl] Wire live preview: debounced evaluation via `ExpressionEngine.evaluate(expr, context)` when `options.context` provided; display value or `—`
- [ ] [impl] Implement single-instance guard in `FoundryEditorRenderer.open()`: focus existing if open, return pending Promise

---

## Group 7: Module Init & game.dtk Registration [wire]

- [ ] [wire] Implement `module/src/index.ts`: call `game.dtk.register({ id: 'dtk-lex', version, api: lexApi })` on `init`; fire `Hooks.callAll('dtk-lex.ready')` after registration
- [ ] [wire] Wire all adapters together: construct `FoundryCodexStore`, `FoundryEditorRenderer`; inject into `CodexRegistry`, `ExpressionEngine`, `ConditionEvaluator`
- [ ] [smoke] Manual smoke test: register a Codex with 3 entries; open visual editor via `game.dtk.api('dtk-lex').openEditor({ systemId: "test" })`; verify autocomplete populates and evaluation preview works
