## ADDED Requirements

### Requirement: CSS reset scoped to DTK application windows
The module SHALL load a CSS stylesheet during Foundry's `init` hook that applies a minimal reset to all elements within a `.dtk-app` root. The reset SHALL neutralise margin, padding, and `box-sizing` defaults inherited from Foundry's global stylesheet, and SHALL normalise form controls (`input`, `button`, `select`, `textarea`) to inherit font and colour from their parent.

#### Scenario: Reset applied to DTK window
- **WHEN** a Foundry window renders with `.dtk-app` on its root element
- **THEN** all child elements have `box-sizing: border-box`, zero default margin and padding, and form controls inherit `font-family` and `color` from `.dtk-app`

#### Scenario: Reset does not affect non-DTK UI
- **WHEN** a Foundry sidebar, scene control, or non-DTK application window renders
- **THEN** its styles are unaffected by the dtk-fascia stylesheet (no global selectors outside `.dtk-app`)

#### Scenario: Stylesheet loaded once per session
- **WHEN** the Foundry client loads with dtk-fascia enabled
- **THEN** exactly one `<link>` or `<style>` element for dtk-fascia appears in `<head>` regardless of how many DTK windows are open

---

### Requirement: FasciaApp base class applies reset scope
The module SHALL export `FasciaApp`, a concrete class extending `HandlebarsApplicationMixin(ApplicationV2)`, that adds the `.dtk-app` CSS class to the application's root element automatically during `_onRender`.

#### Scenario: Root element class applied on render
- **WHEN** a class extending `FasciaApp` calls `render()`
- **THEN** the application's root element has the `dtk-app` CSS class present in the DOM

#### Scenario: FasciaApp inherits ApplicationV2 lifecycle
- **WHEN** `FasciaApp` or its subclass calls `render()`, `close()`, or `setPosition()`
- **THEN** those lifecycle methods behave identically to `ApplicationV2` equivalents

---

### Requirement: withFascia mixin for classes with existing inheritance
The module SHALL export `withFascia(Base)`, a mixin function that accepts any class extending `ApplicationV2` and returns a class that also applies the `.dtk-app` root class during `_onRender`.

#### Scenario: Mixin applied to ActorSheet subclass
- **WHEN** a module calls `withFascia(ActorSheet)` and renders the resulting class
- **THEN** the rendered application's root element has the `dtk-app` class and the actor sheet's own `_onRender` logic still executes

#### Scenario: Mixin does not alter non-render lifecycle
- **WHEN** `withFascia` is applied to any `ApplicationV2` subclass
- **THEN** constructor, `getData`, and `activateListeners` behaviour is unchanged

---

### Requirement: Light/dark theme support
The reset stylesheet SHALL declare token defaults that produce a light theme by default and SHALL include a `@media (prefers-color-scheme: dark)` block that overrides colour tokens for dark mode. An explicit `data-theme="dark"` attribute on `.dtk-app` SHALL force dark tokens regardless of system preference.

#### Scenario: Light theme by default
- **WHEN** `.dtk-app` renders with no `data-theme` attribute and `prefers-color-scheme` is `light`
- **THEN** `--dtk-color-surface` resolves to the light-mode value

#### Scenario: Dark mode via system preference
- **WHEN** the user's OS reports `prefers-color-scheme: dark`
- **THEN** `--dtk-color-surface` resolves to the dark-mode value inside `.dtk-app`

#### Scenario: Explicit dark override
- **WHEN** `.dtk-app` has `data-theme="dark"` set regardless of OS preference
- **THEN** `--dtk-color-surface` resolves to the dark-mode value
