# Design: dtk-lex

## Decisions

### 1. Codex registry is the system-scoped slug namespace

Codex entries are registered per system id: `LexApi.registerCodex(systemId, codex)`.
This means two installed game systems (`sr5e`, `dcc`) can register different meanings
for the same slug without collision. `CodexRegistry.resolve(systemId, slug)` returns
the `CodexEntry` for that system's slug.

Rationale: DTK can run multiple game systems in one world (rare but supported). System
scoping prevents cross-contamination.

### 2. Expression engine uses a recursive descent parser — no eval()

The expression engine implements a recursive descent parser over a token stream. No
`eval()`, `Function()`, or other dynamic code execution is used. This keeps the engine
sandboxable and avoids CSP issues in Foundry's browser context.

Supported syntax: literals, `@scope.path` references, arithmetic (`+ - * / %`),
comparison (`== != < <= > >=`), logical (`&& ||`), unary (`!`), conditional (`? :`),
function calls (`floor(x)`, `max(a,b)`, `clamp(v,lo,hi)`, `if(cond,t,f)`), and
parenthesisation. Custom functions are registered via `LexApi.registerFunction()`.

Rationale: Eval is a CSP violation vector. A hand-written parser is ~300 lines and
gives full control over error messages and the function registry.

### 3. Condition evaluator consumes named condition definitions from Codex

Conditions (e.g. `"flanked"`, `"prone"`) are defined in the Codex as named expression
strings evaluated against the actor's context. `ConditionEvaluator.evaluate(conditionId, context)`
looks up the condition definition from `CodexRegistry`, evaluates the expression, and
returns a boolean.

This makes conditions data-driven (YAML-authored, not hardcoded in TypeScript) and
means game system authors can define what "flanked" means for their system.

### 4. Visual editor is a floating ApplicationV2 panel with slot-based completion

The visual editor is a non-modal `ApplicationV2` floating panel that opens over the
Foundry canvas. It provides:
- A text input for the raw expression
- A real-time token parser that underlines syntax errors
- An autocomplete dropdown populated from `CodexRegistry.listSlugs(systemId)` when
  the cursor is at an `@` character
- A live preview panel showing the evaluated value against the focused token/actor

The editor is launched via `LexApi.openEditor(options)` and resolves a Promise with
the authored expression string when the user confirms. This makes it usable from any
ApplicationV2 sheet in the ecosystem.

### 5. LexApi implements IExpressionDelegate — zero config integration with dtk-alea

When dtk-lex is installed, dtk-alea's `LexExpressionDelegate` adapter calls
`game.dtk.api<LexApi>('dtk-lex')?.evaluate(expr, context)` automatically. dtk-lex
does not need to register itself with dtk-alea — the adapter already polls `game.dtk`.

### 6. Codex JSON export for dtk-promptuarium

`LexApi.exportCodexJson(systemId)` returns a plain JSON object mapping slug → display
name, matching the format that `JsonCodexProvider` in dtk-promptuarium expects. This
is the handshake between the two premium modules.

---

## Module Architecture

### Domain (pure TypeScript, no Foundry globals)

```
src/domain/
  CodexEntry.ts          — value object: { slug, displayName, description?, formula? }
  CodexRegistry.ts       — service: Map<systemId, Map<slug, CodexEntry>>; register, resolve, list
  Token.ts               — value object: tokens emitted by Lexer
  Lexer.ts               — tokenises expression strings into Token[]
  Parser.ts              — recursive descent; produces AST nodes
  Interpreter.ts         — walks AST, evaluates against ExpressionContext; returns number | boolean | string | null
  ExpressionEngine.ts    — orchestrates Lexer → Parser → Interpreter; public entry point
  ConditionEvaluator.ts  — looks up condition definition → evaluates via ExpressionEngine
  FunctionRegistry.ts    — Map<name, (args: Value[]) => Value>; built-in + custom functions
```

### Ports

```
src/ports/
  ICodexStore.ts         — persist/load registered Codexes across sessions
  IEditorRenderer.ts     — open the floating editor UI; resolves Promise<string | null>
```

### Adapters

```
src/adapters/foundry/
  FoundryCodexStore.ts   — reads/writes Codex via game.settings (world-scope JSON)
  FoundryEditorRenderer.ts — renders LexEditorApplication (ApplicationV2); resolves on confirm/cancel
src/adapters/in-memory/
  InMemoryCodexStore.ts
  NullEditorRenderer.ts  — immediately resolves with a provided fixture expression (for tests)
```

### Bounded Context Invariants

- `ExpressionEngine` never reads Foundry globals directly; receives `ExpressionContext` as a plain object
- `CodexRegistry` is an in-memory index; `ICodexStore` handles persistence
- The visual editor (ApplicationV2) lives entirely in `adapters/foundry/` — it is never imported by domain/
- Custom functions registered via `FunctionRegistry` are pure `(args) => value` — no side effects
