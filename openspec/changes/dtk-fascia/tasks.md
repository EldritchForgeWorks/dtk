## 1. Module scaffold

- [x] 1.1 Create `dtk-fascia` repo directory with `module.json`, `package.json`, and `vite.config.ts` mirroring the dtk-alea build pattern (entry: `src/index.ts`, CSS extracted to `dtk-fascia.css`)
- [x] 1.2 Add `src/index.ts` entry point that imports the stylesheet and calls `registerPartials()` and `registerFasciaHooks()` on Foundry `init`
- [x] 1.3 Declare `module.json` metadata: id `dtk-fascia`, title "DTK Fascia", free tier, Foundry V12+ compatibility

## 2. CSS reset and stylesheet (`styles/`)

- [x] 2.1 Create `styles/reset.css` — scoped to `.dtk-app`: `*, box-sizing: border-box; margin/padding: 0; form controls inherit font/color`
- [x] 2.2 Create `styles/tokens-light.css` — define all `--dtk-space-*`, `--dtk-color-*`, `--dtk-font-*`, `--dtk-radius-*` tokens on `.dtk-app` for light theme
- [x] 2.3 Create `styles/tokens-dark.css` — override colour tokens for dark theme via `@media (prefers-color-scheme: dark)` and `.dtk-app[data-theme="dark"]`
- [x] 2.4 Create `styles/index.css` that imports reset, tokens-light, tokens-dark in order

## 3. FasciaApp base class and withFascia mixin (`src/`)

- [x] 3.1 [test] Write Vitest tests for `FasciaApp._onRender()`: asserts `.dtk-app` class added to root element, ApplicationV2 lifecycle preserved (mock ApplicationV2)
- [x] 3.2 [impl] Create `src/FasciaApp.ts` — `class FasciaApp extends HandlebarsApplicationMixin(ApplicationV2)` that adds `.dtk-app` to `this.element` in `_onRender()`
- [x] 3.3 [test] Write Vitest tests for `withFascia(Base)`: asserts mixin adds `.dtk-app` to root; original `_onRender` still called; non-render lifecycle unchanged
- [x] 3.4 [impl] Create `src/withFascia.ts` — `withFascia(Base)` mixin function applying `.dtk-app` class; chain calls to `super._onRender()`
- [x] 3.5 Export `FasciaApp` and `withFascia` from `src/index.ts`

## 4. Handlebars partial templates (`src/partials/`)

- [x] 4.1 Create `src/partials/sheet.hbs` — `<header>{{title}}</header><main></main><footer></footer>` semantic skeleton
- [x] 4.2 Create `src/partials/card.hbs` — `<article><header>{{label}}</header><section class="dtk-card__body">{{{body}}}</section>{{#if actions}}<footer class="dtk-card__actions"></footer>{{/if}}</article>`
- [x] 4.3 Create `src/partials/dialog.hbs` — `<form><header>{{title}}</header><section class="dtk-dialog__body">{{{body}}}</section><footer class="dtk-dialog__buttons"><button type="submit">{{confirmLabel}}</button><button type="button">{{cancelLabel}}</button></footer></form>`
- [x] 4.4 Create `src/partials/field.hbs` — `<div class="dtk-field"><label for="{{inputId}}">{{label}}{{#if required}}<span aria-hidden="true">*</span>{{/if}}</label></div>`
- [x] 4.5 Create `src/partials/section.hbs` — `<section>{{#if heading}}<h2>{{heading}}</h2>{{/if}}</section>`

## 5. Partial registration (`src/`)

- [x] 5.1 [test] Write Vitest tests for `registerPartials()`: asserts `Handlebars.registerPartial` called once per partial with correct name and non-empty template string; mock Handlebars
- [x] 5.2 [impl] Create `src/registerPartials.ts` — imports each `.hbs` file as `?raw` string, calls `Handlebars.registerPartial('dtk-sheet', ...)` etc. for all five partials
- [x] 5.3 [impl] Create `src/registerFasciaHooks.ts` — Foundry `Hooks.once('init', ...)` that calls `registerPartials()`

## 6. Build verification

- [x] 6.1 Run `npm run build` in the fascia repo; confirm `dtk-fascia.js` and `dtk-fascia.css` emit without errors
- [x] 6.2 Run `npm test`; confirm all Vitest tests pass (FasciaApp, withFascia, registerPartials)
- [x] 6.3 Confirm CSS output contains `.dtk-app` scoped selectors only (grep for global element selectors like `^body` or `^html` — should find none)

## 7. Smoke test (manual — requires live Foundry)

- [ ] 7.1 Enable dtk-fascia in Foundry module settings; F5 reload; confirm no console errors during init hook
- [ ] 7.2 Open a DTK application window; verify `.dtk-app` class present on root element (DevTools inspector)
- [ ] 7.3 Inspect `--dtk-space-4` computed value in DevTools; confirm it resolves to `16px`
- [ ] 7.4 Toggle OS dark mode; confirm `--dtk-color-surface` changes without page reload
- [ ] 7.5 Confirm `{{> dtk-sheet title="Test"}}` renders `<header>` containing "Test" in a test template
