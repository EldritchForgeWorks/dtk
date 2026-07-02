## Context

Foundry VTT V12 ships with global CSS that leaks into every application window via `.window-content` and element selectors. DTK modules currently render HTML without any baseline, resulting in inconsistent spacing, unstyled form controls, and varying typography across sheets and cards. Each module has been hand-rolling the same resets ad-hoc.

`dtk-fascia` is a new FREE-tier Foundry module that loads a single stylesheet and registers Handlebars partials during the `init` hook. Downstream modules declare it as a required dependency in their `module.json`. No npm package is needed — fascia is a pure UI layer.

## Goals / Non-Goals

**Goals:**
- Neutralise Foundry's leaking global styles inside DTK application windows without breaking the rest of the Foundry UI.
- Establish a CSS custom-property token contract that downstream modules reference for spacing, colour, type scale, and radius.
- Provide Handlebars partials that emit semantic HTML skeletons reusable across sheets, cards, and dialogs.
- Expose a `FasciaApp` base class (extends `ApplicationV2 + HandlebarsApplicationMixin`) that automatically scopes the reset to the application's root element.
- Support light/dark variants via `prefers-color-scheme` and an explicit `data-theme="dark"` override.

**Non-Goals:**
- Imposing a specific font family (respect Foundry's user font setting).
- Providing a full component library (buttons, selects, grids) — tokens and structure only.
- Replacing Foundry's default application chrome (window header, close button, drag handle).
- Managing application state or data binding.
- Shipping an npm package (`@eldritchforgeworks/dtk-fascia`) — no domain logic to share.

## Decisions

### 1. Scoped reset via `.dtk-app` class, not a global override

**Decision**: The CSS reset and token application target `.dtk-app` as a root class, applied by `FasciaApp` to the `<section class="window-content">` element during `_onRender()`.

**Why not global?** Foundry's UI (scene controls, sidebar, hotbar) depends on browser defaults and Foundry's own global stylesheet. A global reset breaks these. Scoping to `.dtk-app` isolates the effect to DTK windows.

**Alternatives considered**:
- Shadow DOM — not supported by Foundry's `ApplicationV2` rendering pipeline.
- CSS `@layer` — does not prevent Foundry globals from bleeding in; still needs a specificity anchor.

### 2. Hand-rolled minimal reset over a CSS framework

**Decision**: Write a ~80-line reset targeting the HTML elements most affected by Foundry's globals (`*, box-sizing, margin, padding, input, button, select, textarea`). No external dependency (not Pico.css, not normalize.css).

**Why not a framework?** Pico.css and similar frameworks make opinionated decisions about element appearance that conflict with Foundry's existing chrome. A purpose-built reset can be precisely tuned to DTK's needs without fighting a framework's specificity wars.

**Trade-off**: We own the reset and must update it if Foundry's base styles change significantly. Acceptable given the small surface area.

### 3. `--dtk-` prefix for all tokens; flat naming for simplicity

**Decision**: All tokens use `--dtk-{category}-{scale}` naming, e.g., `--dtk-space-2`, `--dtk-color-surface`, `--dtk-radius-md`. Defined on `:root` inside `.dtk-app` using `:root:has(.dtk-app)` (not strictly required — tokens declared at `.dtk-app` level).

**Scale choices**: Space: `1, 2, 3, 4, 6, 8, 12, 16` (4px base). Radius: `sm (2px), md (4px), lg (8px)`. Type: `xs, sm, md, lg, xl` mapping to `rem` values.

**Why not a semantic alias layer?** (e.g., `--dtk-color-primary` → `--dtk-color-teal-500`) Adds indirection without enough consumer diversity to justify it at this stage. One layer of tokens is sufficient.

### 4. Handlebars partial registry wired in the `init` hook

**Decision**: Register partials via `Handlebars.registerPartial('dtk-sheet', template)` during Foundry's `init` hook. Template HTML is bundled as string constants in the JS output (Vite `?raw` import).

**Why not separate `.hbs` files loaded at runtime?** Avoids async fetch during `init`; partial registration must be synchronous. Bundling the strings keeps the module self-contained.

**Partial naming**: `dtk-sheet`, `dtk-card`, `dtk-dialog`, `dtk-field`, `dtk-section` — all prefixed to avoid collision with Foundry or system-defined partials.

### 5. `FasciaApp` mixin pattern, not forced inheritance

**Decision**: Export `FasciaApp` as a concrete base class (`class FasciaApp extends HandlebarsApplicationMixin(ApplicationV2)`). Also export `withFascia(Base)` as a mixin for modules that already extend a Foundry class.

**Why both?** Foundry's `ActorSheet` and `ItemSheet` extend their own base classes in V12; a mixin lets fascia be grafted onto those without diamond inheritance issues.

## Risks / Trade-offs

- **Foundry version drift**: Foundry may rename `.window-content` or restructure application HTML in a future V-major. Mitigation: scope the selector to the `element` property from `ApplicationV2` directly in `_onRender`, not to a hardcoded CSS class name.
- **Partial name collision**: `dtk-sheet` could theoretically collide with a game system's own partial. Mitigation: document the `dtk-` namespace reservation in the fascia README; low probability in practice.
- **Token drift**: downstream modules reference tokens that change between fascia versions. Mitigation: treat the token contract as a versioned API; semver bumps on any removal or rename.
- **No hex architecture needed**: fascia has no domain logic, no ports, no adapters. Its source is flat: `src/partials/`, `src/FasciaApp.ts`, `src/index.ts`, `styles/`. Hexagonal layout would be overhead without benefit.

## Open Questions

### TyphonJS Runtime Library (TRL) / Svelte support

TRL is a community framework for building Foundry VTT modules with Svelte. It uses `SvelteApplication` as its base class instead of `ApplicationV2 + HandlebarsApplicationMixin`, with a fully different rendering pipeline. The CSS reset and component tokens in `dtk-fascia` are framework-agnostic and would benefit TRL-based modules automatically. However, the Handlebars partials do not apply to Svelte.

**Open**: If a future DTK module adopts TRL/Svelte (e.g., a Svelte-based character sheet in dtk-opus), should fascia grow a Svelte component layer?

Options:
1. **Separate package** (`dtk-fascia-svelte`) — keeps the Handlebars module lean; Svelte consumers add the second package. Clean split, extra maintenance surface.
2. **Unified module, optional peer dep** — fascia registers Svelte components when TRL is detected at runtime; single install for consumers. More complex build (Vite Svelte plugin needed).
3. **Defer entirely** — TRL/Svelte is outside the current DTK tech stack (`ApplicationV2 + HandlebarsApplicationMixin only`). Revisit when there is a concrete Svelte-based DTK module that needs it.

**Current default**: option 3 — defer. The tech stack update and TRL dependency decision should be made as a separate formal change before any implementation begins.

## Migration Plan

1. Create `dtk-fascia` module repo with Vite build.
2. Ship the stylesheet and partials with no downstream enforcement — modules opt in.
3. Update `dtk-runeforge` (chat cards) and `dtk-opus` (sheets, when it lands) to extend `FasciaApp` as a follow-on change.
4. No rollback complexity — fascia is additive; removing it just reverts downstream modules to their previous un-styled baseline.
