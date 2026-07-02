## ADDED Requirements

### Requirement: Partial registration during init hook
The module SHALL register all DTK Handlebars partials via `Handlebars.registerPartial()` synchronously during Foundry's `init` hook, before any downstream module renders. Partial names SHALL use the `dtk-` prefix to prevent collision with Foundry system-defined partials.

#### Scenario: Partials available before renderApplication
- **WHEN** a downstream module attempts to render a template that includes `{{> dtk-sheet}}` during the `ready` hook
- **THEN** the partial resolves correctly because fascia's `init` hook ran first

#### Scenario: Partial names are namespaced
- **WHEN** dtk-fascia registers its partials
- **THEN** each partial name begins with `dtk-` (e.g., `dtk-sheet`, `dtk-card`, `dtk-dialog`)

---

### Requirement: dtk-sheet partial — actor/item sheet skeleton
The `dtk-sheet` partial SHALL emit a semantic HTML skeleton suitable for an actor or item sheet, consisting of a `<header>` (for sheet name, portrait, and navigation tabs), a `<main>` (for tab content), and a `<footer>` (optional action bar). The partial SHALL accept a `title` context variable for the `<header>` heading.

#### Scenario: Sheet partial renders header and main
- **WHEN** a Handlebars template includes `{{> dtk-sheet title=actor.name}}`
- **THEN** the rendered HTML contains `<header>`, `<main>`, and `<footer>` elements in document order

#### Scenario: Title variable rendered in header
- **WHEN** `{{> dtk-sheet title="Arcanist"}}` is rendered
- **THEN** the `<header>` contains the text "Arcanist"

---

### Requirement: dtk-card partial — chat card skeleton
The `dtk-card` partial SHALL emit a semantic `<article>` with a `<header>` (action/roll label), a `<section class="dtk-card__body">` (roll result content), and an optional `<footer class="dtk-card__actions">` (inline action buttons). The partial SHALL accept `label` and `body` context variables.

#### Scenario: Card partial renders article structure
- **WHEN** `{{> dtk-card label="Strike" body=rollHTML}}` is rendered
- **THEN** the output is an `<article>` containing a `<header>` with "Strike" and a `<section>` with the roll HTML

#### Scenario: Card footer omitted when no actions
- **WHEN** `{{> dtk-card label="Strike" body=rollHTML}}` is rendered without an `actions` variable
- **THEN** no `<footer>` element is present in the rendered HTML

---

### Requirement: dtk-dialog partial — confirmation/input dialog skeleton
The `dtk-dialog` partial SHALL emit a `<form>` wrapping a `<header>`, a `<section class="dtk-dialog__body">` (prompt content), and a `<footer class="dtk-dialog__buttons">` (confirm/cancel buttons). The partial SHALL accept `title`, `body`, `confirmLabel`, and `cancelLabel` context variables.

#### Scenario: Dialog partial renders form structure
- **WHEN** `{{> dtk-dialog title="Confirm" body="Are you sure?" confirmLabel="Yes" cancelLabel="No"}}` is rendered
- **THEN** the output contains a `<form>` with `<header>`, `<section>`, and `<footer>` elements, and buttons labelled "Yes" and "No"

---

### Requirement: dtk-field partial — labelled form field wrapper
The `dtk-field` partial SHALL emit a `<div class="dtk-field">` containing a `<label>` (with a `for` attribute matching the input id) and a slot for the field's control. The partial SHALL accept `label`, `inputId`, and `required` context variables. If `required` is truthy, the label SHALL include a `<span aria-hidden="true">*</span>` marker.

#### Scenario: Field partial renders label with for attribute
- **WHEN** `{{> dtk-field label="Strength" inputId="attr-str"}}` is rendered
- **THEN** the output contains `<label for="attr-str">Strength</label>`

#### Scenario: Required marker present when required is true
- **WHEN** `{{> dtk-field label="Name" inputId="char-name" required=true}}` is rendered
- **THEN** the label contains an asterisk marker element

#### Scenario: Required marker absent when required is false
- **WHEN** `{{> dtk-field label="Nickname" inputId="char-nick" required=false}}` is rendered
- **THEN** no asterisk marker element appears in the label

---

### Requirement: dtk-section partial — named content section
The `dtk-section` partial SHALL emit a `<section>` with an optional `<h2>` heading when a `heading` context variable is provided. When no heading is provided, the `<section>` renders without a heading element.

#### Scenario: Section with heading
- **WHEN** `{{> dtk-section heading="Attributes"}}` is rendered
- **THEN** the output is `<section>` containing `<h2>Attributes</h2>`

#### Scenario: Section without heading
- **WHEN** `{{> dtk-section}}` is rendered with no heading variable
- **THEN** the output is a bare `<section>` with no `<h2>` child
