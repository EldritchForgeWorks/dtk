# Proposal: dtk-lex

## What

dtk-lex is a premium DTK module that implements the **Codex contract** — the expression
language and game-term registry that powers complex rule evaluation across the ecosystem.

It provides:
1. **codex-registry** — register game terms (attributes, skills, conditions, derived stats) as named slugs with metadata
2. **expression-engine** — evaluate complex expressions beyond dtk-alea's built-in arithmetic (conditionals, function calls, string ops, custom functions)
3. **condition-evaluator** — evaluate named game conditions against actor/combat state (e.g. `"flanked"`, `"prone"`, `"outnumbered"`)
4. **visual-editor** — ApplicationV2 floating panel for authoring expressions with autocomplete and live preview
5. **lex-api** — `LexApi` exposed via `game.dtk`; implements dtk-alea's `IExpressionDelegate` port

## Why

dtk-alea's built-in expression parser covers only `@scope.path` references and four
arithmetic operators. Real game systems need conditionals, clamped values, custom
lookup tables, and derived stat formulas. Rather than bloating every free module,
dtk-lex provides these as a purchasable extension — the gate is registered with dtk-hub,
and dtk-alea degrades gracefully when dtk-lex is absent.

The Codex slug registry is also shared infrastructure: dtk-promptuarium reads it for
`{{resolve slug}}` display names, and game system authors use it as the authoritative
glossary for what @-references mean.

## Premium Rationale

Expression engine + visual editor is substantial complexity that primarily benefits
game system publishers (commercial users). Free-tier game designers using Shadowrun 5e
or similar will not need custom expression functions. The ecosystem remains functional
without dtk-lex — premium gates only the advanced expression authoring experience.
