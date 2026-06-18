# Proposal: dtk-opus

## What

dtk-opus is a premium DTK module that implements the **Forma contract** — the character
creation and advancement system that guides players through structured build choices.

It provides:
1. **forma-registry** — register Forma schemas (creation steps, advancement tracks, XP tables) per game system
2. **creation-wizard** — ApplicationV2 multi-step character creation UI driven by Forma YAML
3. **advancement-tracker** — XP spending and ability selection panel with live prerequisite feedback
4. **prerequisite-evaluator** — validates build choices against Forma prerequisite expressions using dtk-lex (optional) or built-in simple checks
5. **opus-api** — `OpusApi` exposed via `game.dtk`; consumed by game systems to trigger creation/advancement flows

## Why

Character creation and advancement are the most complex player-facing workflows in any
TTRPG system. Without dtk-opus, system authors must implement these themselves — a
multi-week effort for each new system. dtk-opus turns that into YAML declarations:

```yaml
# forma/sr5e.yaml
steps:
  - id: metatype
    title: "Choose Metatype"
    choices: { from: species, max: 1 }
  - id: archetype
    title: "Choose Archetype"
    choices: { from: archetype, max: 1 }
  - id: attributes
    title: "Distribute Attribute Points"
    pool: "@metatype.karma_cost + 100"
    spend_on: attributes
```

Prerequisite evaluation integrates with dtk-lex when available for complex expressions,
but falls back to a built-in simple evaluator (level comparisons, ownership checks)
when dtk-lex is absent.

## Premium Rationale

Character creation is polished UI work — multi-step wizard, drag-and-drop assignment,
live validation, advancement preview. This is the highest-value feature for published
game systems and the one most likely to drive premium conversions. Free-tier users can
create characters manually through the standard Foundry actor sheet; dtk-opus is the
guided, system-aware experience.
