## Why

Filed as the recorded follow-up from `add-define-system-smoke-test` (task 2.4). Converting
`dtk-shadowrun` to `defineSystem(modus)` surfaced a real gap: `ModusSchema` /
`ActorTypeConfigSchema` (`packages/types/src/modus/schema.ts`) has no field for a Sheet
class, sheet label, or `makeDefault` — only `label` and `dataModel`. `dtk-shadowrun` still
needs `Actors.registerSheet('dtk-shadowrun', ShadowrunCharacterSheet, { types: [...],
makeDefault: true, label: '...' })` called directly in `index.ts`; it cannot yet be folded
into the Modus declaration consumed by `defineSystem`.

Note: `openspec/specs/modus/spec.md` (Requirement: "Actor type declarations") already
describes `sheet`, `sheetOptions.label`, and `trackableAttributes` as intended fields —
this proposal is the implementation that would make the schema in `packages/types/src/modus/schema.ts`
match what the spec already documents.

## What Changes

- Add optional `sheet` (Foundry Sheet class reference, typed `unknown` at the Zod layer —
  same rationale as `dataModel`) and `sheetOptions: { label: string, makeDefault?: boolean }`
  to `ActorTypeConfigSchema`.
- `SystemRegistrar.build` maps the new fields into `ActorDeclaration` (add `sheet` and
  `sheetOptions` alongside the existing `type`/`label`/`dataModel`).
- `FoundrySystemRegistrar.applyDescriptor` calls `Actors.registerSheet(descriptor.systemId,
  actor.sheet, { types: [actor.type], makeDefault: actor.sheetOptions?.makeDefault ?? false,
  label: actor.sheetOptions?.label ?? actor.label })` for any actor declaring a `sheet`.
- Convert `dtk-shadowrun`'s remaining `Actors.registerSheet` call in `index.ts` into a
  `sheet`/`sheetOptions` entry on `shadowrunModus` (`packages/shadowrun/src/modus.ts`),
  removing the last direct Foundry registration call from shadowrun's `init` hook.

## Non-goals

- No changes to `trackableAttributes` (a separate, still-undeclared Modus field — file
  separately if/when a consumer needs it).
- No change to `ItemTypeConfigSchema` (items don't have sheets in the current Foundry
  actor-sheet-only registration path used by any DTK module yet).

## Impact

- `packages/types/src/modus/schema.ts` (schema addition — breaking for nothing, purely
  additive/optional field).
- `packages/systema/src/domain/services/SystemRegistrar.ts`,
  `packages/systema/src/define-system/foundry-registrar.ts`.
- `packages/shadowrun/src/index.ts`, `packages/shadowrun/src/modus.ts`.
