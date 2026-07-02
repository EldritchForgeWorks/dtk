## Context

`RollResolver` currently evaluates all rules identically — roll `pool` dice, count faces ≥ threshold, classify. The `RitusConfig.mechanic` string is stored and passed through but never branched on. The `RitusMechanicSchema` enum in `@eldritchforgeworks/dtk-types` carries four names (`pool-count`, `pool-sum`, `single-die`, `roll-under`) that conflict with the nine names in the ritus spec (`standard`, `pool-count`, `step-die`, `exploding`, `advantage-disadvantage`, `opposed`, `target-number`, `drama-die`, `custom`). Foundry's dice engine supports most of these natively via formula modifiers (`x` for exploding, `kh` for keep-highest, etc.).

## Goals / Non-Goals

**Goals:**
- Align `RitusMechanicSchema` enum with the ritus spec's nine values
- Add `sides: number` and `explodes: boolean` to `RitusConfig` and `RitusSchema`
- Implement six mechanic branches in `RollResolver`: `pool-count`, `pool-sum`, `exploding`, `step-die`, `roll-under`, `advantage-disadvantage`, `target-number`
- `standard` aliases `pool-count` for backwards compatibility
- Extend `IDiceRoller.roll()` with a `RollOpts` parameter for mechanic-specific roller flags
- Keep `RollResult` shape stable — mechanic emitted on step payload so subscribers can adapt display

**Non-Goals:**
- `drama-die` — symbolic face → tier mapping requires a separate face-range config field not yet designed
- `custom` hook architecture — custom mechanic override via Foundry hooks is a separate feature
- Per-mechanic chat card rendering — dtk-runeforge's concern; it receives `mechanic` in the step payload

## Decisions

### 1. Dispatch in RollResolver via mechanic switch, not separate strategy classes

A switch/if block inside `RollResolver.resolve()` is sufficient for 7–8 cases. Strategy-pattern classes (one class per mechanic) would require a factory and additional wiring, adding complexity without benefit at this scale. The switch is localised to one method.

### 2. IDiceRoller.roll() extended with RollOpts, not separate roll methods

Adding `opts?: RollOpts` keeps the port surface minimal and allows `FoundryDiceRoller` to choose the right Foundry formula modifier per call. An alternative — separate `rollExploding()`, `rollAdvantage()` methods — bloats the interface and forces adapter rewrites for every new mechanic. `RollOpts` is additive; existing call sites pass nothing and get current behaviour.

### 3. sides and explodes are required on RitusConfig (not optional)

Making both fields required catches misconfigured packs at registration time rather than silently defaulting to `6`/`false`. `CompendiumScanner` applies the defaults when reading compendium data so legacy JSON without these fields still loads; the domain type is strict. This is a breaking change for TypeScript consumers who construct `RitusConfig` objects directly.

### 4. advantage-disadvantage needs a keepMode field on RitusConfig

The pool expression controls how many dice to roll; a separate `keepMode: 'highest' | 'lowest'` field on `RitusConfig` controls which single die is retained. Encoding advantage/disadvantage in the pool expression sign would be implicit and error-prone.

### 5. pool-sum reuses tiers field with sum-value semantics

For pool-sum, `tiers.hit`, `tiers.critical`, and `tiers.glancing` are treated as minimum sums rather than minimum hit counts. The ritus JSON author must be aware of this semantic shift; it is documented in the dice-mechanics spec. An alternative — a separate `sumTiers` config field — would keep semantics unambiguous but bloat RitusConfig for an uncommon mechanic. The trade-off favours simplicity.

### 6. mechanic emitted in dtk-alea.step payload

`SequenceExecutor` already emits `tier`, `netHits`, `hits`, `faces`, and `pool`. Adding `mechanic` (string) from `effectiveConfig.mechanic` lets display adapters (dtk-runeforge) render pool-count dice differently from step-die dice without re-fetching the ritus config.

## Risks / Trade-offs

- [Breaking change: RitusConfig shape] All existing ritus compendium JSON without `sides` and `explodes` will fail TypeScript type checks but still load at runtime (CompendiumScanner defaults). Mitigation: update all pack sources in dtk-runeforge as part of this change; document migration for third parties.
- [pool-sum tier semantics] Authors migrating from pool-count may misinterpret `tiers.hit` as a face count. Mitigation: spec and error message are explicit.
- [Foundry formula string injection] `sides` flows from compendium JSON into `new Roll(formula)`. Mitigation: validate `sides` as a positive integer in `RitusSchema` and clamp in `CompendiumScanner`; never interpolate raw strings from untrusted sources.

## Migration Plan

1. Update `@eldritchforgeworks/dtk-types`: align `RitusMechanicSchema` enum; add `sides`, `explodes`, `keepMode` to `RitusSchema` and `RitusConfig`
2. Update `dtk-alea`: `IDiceRoller`, `RollOpts`, `FoundryDiceRoller`, `RollResolver` dispatch, `CompendiumScanner` defaults, `SequenceExecutor` emit
3. Update `dtk-runeforge` packs: add `sides`, `explodes` fields to all ritus JSON; recompile packs
4. Existing third-party ritus packs without `sides`/`explodes` continue to work at runtime (scanner defaults) but fail strict TypeScript validation

## Open Questions

- Should `drama-die` face-range mapping reuse `tiers` (with face-count semantics) or a separate `faces` field? Deferred to a follow-on change.
- `opposed` mechanic: currently handled as a step-level flag (`step.opposed`), not a mechanic variant. Should it become a mechanic value as well for ritus-level opposed defaults? Deferred.
