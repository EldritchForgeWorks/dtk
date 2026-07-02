## ADDED Requirements

### Requirement: Space scale tokens
The stylesheet SHALL define a space scale using CSS custom properties on `.dtk-app`, based on a 4px base unit, covering steps `1, 2, 3, 4, 6, 8, 12, 16` (e.g., `--dtk-space-2` = 8px, `--dtk-space-4` = 16px). All DTK module stylesheets SHALL reference these tokens for margin, padding, and gap values.

#### Scenario: Token resolves to expected pixel value
- **WHEN** a stylesheet within `.dtk-app` uses `padding: var(--dtk-space-2)`
- **THEN** the computed padding is 8px

#### Scenario: All scale steps defined
- **WHEN** the dtk-fascia stylesheet is loaded
- **THEN** `--dtk-space-1` through `--dtk-space-16` (at defined steps) are resolvable on any `.dtk-app` element

---

### Requirement: Colour palette tokens
The stylesheet SHALL define semantic colour tokens on `.dtk-app` covering: `surface` (background), `surface-raised` (card/panel), `surface-overlay` (modal backdrop), `on-surface` (default text), `on-surface-muted` (secondary text), `border`, `accent` (interactive highlight), and `accent-on` (text on accent). Light and dark variants SHALL be defined via media query and `data-theme`.

#### Scenario: Surface token in light mode
- **WHEN** `.dtk-app` is in light mode
- **THEN** `--dtk-color-surface` resolves to a near-white value (e.g., `#fafaf9`)

#### Scenario: Accent token accessible contrast
- **WHEN** text using `--dtk-color-accent-on` renders on a background of `--dtk-color-accent`
- **THEN** the contrast ratio is at least 4.5:1 (WCAG AA)

#### Scenario: Muted text token
- **WHEN** a `<p>` uses `color: var(--dtk-color-on-surface-muted)`
- **THEN** the computed colour is visually distinct from `--dtk-color-on-surface` but still legible

---

### Requirement: Typography scale tokens
The stylesheet SHALL define font-size tokens `--dtk-font-xs, sm, md, lg, xl` mapping to `rem` values (e.g., `xs = 0.75rem`, `md = 1rem`, `xl = 1.5rem`). A `--dtk-font-weight-normal` (400) and `--dtk-font-weight-bold` (600) token SHALL also be defined. The stylesheet SHALL NOT set `font-family` on `.dtk-app` — Foundry's inherited font setting is preserved.

#### Scenario: Base font size respected
- **WHEN** an element within `.dtk-app` uses `font-size: var(--dtk-font-md)`
- **THEN** the computed size is 1rem (relative to the user's browser/Foundry root font size)

#### Scenario: No font-family override
- **WHEN** dtk-fascia is loaded and a `.dtk-app` window opens
- **THEN** the `font-family` of text within the window matches Foundry's global font setting, not a fascia-imposed font

---

### Requirement: Border-radius tokens
The stylesheet SHALL define `--dtk-radius-sm` (2px), `--dtk-radius-md` (4px), and `--dtk-radius-lg` (8px) for use by components such as cards, inputs, and buttons.

#### Scenario: Radius token applied to card
- **WHEN** a `.dtk-card` element uses `border-radius: var(--dtk-radius-md)`
- **THEN** the computed border-radius is 4px

---

### Requirement: Stable token contract
All token names (`--dtk-space-*`, `--dtk-color-*`, `--dtk-font-*`, `--dtk-radius-*`) SHALL be treated as a versioned public API. Any removal or rename SHALL trigger a semver minor bump in the fascia module version. Additions are non-breaking.

#### Scenario: Token renaming is a breaking change
- **WHEN** a token such as `--dtk-color-surface` is renamed or removed
- **THEN** the fascia module version is incremented at minimum by a minor version and a migration note is added to the changelog

#### Scenario: Token addition is non-breaking
- **WHEN** a new token such as `--dtk-space-20` is added to the stylesheet
- **THEN** no version bump is required for the fascia module and existing consumers are unaffected
