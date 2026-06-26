# visual-editor Specification

## Purpose
TBD - created by archiving change dtk-lex. Update Purpose after archive.
## Requirements
### Requirement: Editor opened via LexApi.openEditor()

`LexApi.openEditor(options: EditorOptions): Promise<string | null>` SHALL open the
floating editor panel and resolve the Promise when the user confirms (returns the
expression string) or cancels (returns `null`). `EditorOptions`:
- `systemId: string` — used to populate autocomplete from CodexRegistry
- `initialExpression?: string` — pre-fill the editor input
- `context?: ExpressionContext` — used for live preview evaluation
- `title?: string` — dialog header

Only one editor instance SHALL be open at a time. Calling `openEditor()` while an
existing editor is open SHALL bring the existing editor to focus and return its
pending Promise.

#### Scenario: openEditor resolves with expression on confirm

- **WHEN** the user types `"@agility + 2"` and clicks Confirm
- **THEN** the Promise resolves with `"@agility + 2"`

#### Scenario: openEditor resolves with null on cancel

- **WHEN** the user clicks Cancel or presses Escape
- **THEN** the Promise resolves with `null`

#### Scenario: Second openEditor call focuses existing editor

- **WHEN** `openEditor()` is called while an editor is already open
- **THEN** the existing editor is brought to focus; the first Promise is still pending; no second dialog opens

---

### Requirement: Real-time syntax error indication

As the user types, the editor SHALL parse the expression and underline tokens that
are part of a `ParseError` node in red. The underline updates within 300ms of the
last keystroke (debounced). No error indication appears for a blank input.

#### Scenario: Invalid expression shows underline

- **WHEN** the user types `"@attr +"` (incomplete)
- **THEN** within 300ms a red underline appears on the incomplete operator token

#### Scenario: Blank input shows no error

- **WHEN** the input field is empty
- **THEN** no error underline is shown

#### Scenario: Valid expression clears error state

- **WHEN** the user completes `"@attr + 2"` after a prior error state
- **THEN** the error underline is removed

---

### Requirement: Autocomplete on @ character

When the cursor is at or immediately after an `@` character, the editor SHALL display
a dropdown of slugs from `CodexRegistry.listSlugs(systemId)`. The dropdown SHALL
filter as the user continues typing after `@`. Selecting a slug inserts it at the
cursor position.

#### Scenario: Dropdown opens on @ character

- **WHEN** the user types `@` and `listSlugs("sr5e")` returns `["agility", "body"]`
- **THEN** a dropdown with `agility` and `body` is displayed

#### Scenario: Dropdown filters on further typing

- **WHEN** the user types `@ag`
- **THEN** only `agility` remains in the dropdown

#### Scenario: Slug selection inserts full reference

- **WHEN** the user selects `agility` from the dropdown
- **THEN** `@agility` is inserted at the cursor (replacing the partial `@ag` if present)

---

### Requirement: Live preview panel

When `options.context` is provided, the editor SHALL display a live preview showing
the evaluated value of the current expression against that context. The preview updates
with the same debounce as syntax checking. Null results display as `—`. ParseError
results display the error message.

#### Scenario: Live preview shows evaluated value

- **WHEN** `context.agility = 6` and the expression is `"@agility + 2"`
- **THEN** the preview panel displays `8`

#### Scenario: Live preview shows null as dash

- **WHEN** the expression evaluates to `null`
- **THEN** the preview panel displays `—`

#### Scenario: No context provided hides preview panel

- **WHEN** `openEditor()` is called without a `context` option
- **THEN** the preview panel is not rendered

