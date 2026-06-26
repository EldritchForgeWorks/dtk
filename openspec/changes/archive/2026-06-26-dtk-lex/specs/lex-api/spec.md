# Spec: lex-api

LexApi is the public surface of dtk-lex, exposed via `game.dtk`. It implements
dtk-alea's `IExpressionDelegate` port and serves as the integration point for other
DTK modules.

## ADDED Requirements

### Requirement: LexApi registered with game.dtk on init

On `init`, dtk-lex SHALL call `game.dtk.register({ id: 'dtk-lex', version, api: lexApi })`.
The `api` object SHALL implement `LexApi` from `@dtk/types/apis`. After registration
completes, dtk-lex SHALL fire `Hooks.callAll('dtk-lex.ready')`.

#### Scenario: LexApi accessible via game.dtk after init

- **WHEN** dtk-lex's `init` hook has fired
- **THEN** `game.dtk.api<LexApi>('dtk-lex')?.registerCodex` is callable

#### Scenario: dtk-lex.ready fires after registration

- **WHEN** `game.dtk.register()` completes
- **THEN** `Hooks.callAll('dtk-lex.ready')` is emitted

---

### Requirement: LexApi.evaluate() implements IExpressionDelegate

`LexApi.evaluate(expression: string, context: ExpressionContext): Value | null` SHALL
delegate to `ExpressionEngine.evaluate()` and return the result. This is the method
dtk-alea's `LexExpressionDelegate` adapter calls. Returns `null` and logs a warning
if dtk-lex is not yet ready when called.

#### Scenario: Complex expression evaluated via LexApi

- **WHEN** `game.dtk.api<LexApi>('dtk-lex')?.evaluate("floor(@agility * 1.5)", context)` is called
- **THEN** the evaluated numeric result is returned

#### Scenario: evaluate() called before ready returns null with warning

- **WHEN** `evaluate()` is called before the `init` hook has completed
- **THEN** `null` is returned; a console warning notes dtk-lex is not ready

---

### Requirement: LexApi.registerFunction() adds custom functions

`LexApi.registerFunction(name: string, fn: (args: Value[]) => Value): void` SHALL add
the function to the `FunctionRegistry`. If the name collides with a built-in, a
console warning is logged and the custom function replaces the built-in.

#### Scenario: Registered function available in subsequent evaluations

- **WHEN** `LexApi.registerFunction("lookup", fn)` is called
- **THEN** `LexApi.evaluate("lookup(@type)", context)` calls `fn` with the resolved arg

---

### Requirement: LexApi.openEditor() surface

`LexApi.openEditor(options: EditorOptions): Promise<string | null>` SHALL delegate to
`IEditorRenderer.open(options)`. If the Foundry environment is not available (e.g.,
called from a Node.js test context with `NullEditorRenderer`), it SHALL resolve
immediately with `null`.

#### Scenario: openEditor delegates to IEditorRenderer

- **WHEN** `LexApi.openEditor({ systemId: "sr5e" })` is called in a Foundry context
- **THEN** `IEditorRenderer.open()` is called and its Promise is returned

---

### Requirement: LexApi surface summary

The full `LexApi` interface SHALL be exposed via `game.dtk` with the following methods:

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerCodex` | `(systemId, entries) => void` | Register Codex entries for a system |
| `evaluate` | `(expr, context) => Value\|null` | Evaluate expression (IExpressionDelegate impl) |
| `registerFunction` | `(name, fn) => void` | Add custom function |
| `openEditor` | `(options) => Promise<string\|null>` | Open visual editor |
| `exportCodexJson` | `(systemId) => Record<string,string>` | Export slug→displayName map |
| `resolveCondition` | `(systemId, condId, ctx) => boolean` | Evaluate named condition |
| `isReady` | `boolean` | Whether init has completed |

#### Scenario: LexApi members all accessible after init

- **WHEN** dtk-lex's `init` hook has fired
- **THEN** all seven members (`registerCodex`, `evaluate`, `registerFunction`, `openEditor`, `exportCodexJson`, `resolveCondition`, `isReady`) are present on `game.dtk.api<LexApi>('dtk-lex')`
