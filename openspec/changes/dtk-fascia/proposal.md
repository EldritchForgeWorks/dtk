## Why

Every DTK module that renders UI (character sheets, chat cards, modals, dialog boxes) currently solves the same baseline problems independently: browser CSS quirks, Foundry's opinionated default styles, spacing scale, and structural markup. This produces inconsistent visual output across modules and forces each module to re-implement a reset and a token layer. `dtk-fascia` establishes a shared visual foundation that all DTK modules build on, so the ecosystem looks and behaves coherently out of the box.

## What Changes

- Introduce `dtk-fascia` as a new FREE-tier Foundry module in the ecosystem.
- Ship a lightweight CSS reset (scoped to DTK application shells) that neutralises Foundry's global styles without fighting the rest of the UI.
- Define a CSS custom-property token system covering spacing, typography scale, border-radius, and a colour palette with light/dark variant hooks.
- Provide a Handlebars partial registry — pre-registered partial skeletons for sheets, cards, and dialogs that emit consistent semantic HTML (`<header>`, `<main>`, `<footer>`, `<section>`, `<fieldset>`, `<label>`, etc.).
- Expose a `FasciaApp` base class (extending `ApplicationV2 + HandlebarsApplicationMixin`) that automatically applies the reset and token layer to any window that inherits from it.
- Document the token contract so game designers can theme the entire ecosystem by overriding a handful of CSS custom properties in their system stylesheet.

## Capabilities

### New Capabilities

- `style-foundation`: CSS reset scoped to DTK application shells + base element normalisation. Loaded once by the fascia module init hook; downstream modules opt in by extending `FasciaApp` or applying the `dtk-fascia` CSS class to their application root.
- `component-tokens`: CSS custom property system. Defines the canonical set of design tokens (colours, spacing scale, type scale, radius, shadow) consumed by all DTK module stylesheets. Supports light/dark via `prefers-color-scheme` and an explicit `data-theme` override.
- `template-partials`: Handlebars partial registry. Pre-registered partials (`dtk-sheet`, `dtk-card`, `dtk-dialog`, `dtk-field`, `dtk-section`) that emit semantic HTML skeletons wired to the token system. Modules compose these rather than hand-rolling structural markup.

### Modified Capabilities

*(none — no existing spec-level requirements change)*

## Impact

- **New module**: `dtk-fascia` — independent repo, free tier, loaded before other DTK UI modules via Foundry module dependency declaration.
- **Downstream modules** (dtk-opus, dtk-runeforge, and any future UI-bearing module): should extend `FasciaApp` and use the provided partials; not a hard breaking requirement at launch, but expected adoption path.
- **dtk-systema**: may reference fascia as an optional dependency for consistent sheet rendering once dtk-opus lands.
- **`@dtk/types`**: no changes needed — fascia has no shared contract types (it is purely a UI concern).
- **Build**: fascia ships its own Vite build producing a single JS entry + a CSS bundle; no npm package required.
