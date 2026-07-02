## 1. Modus schema

- [ ] 1.1 [test] Add `sheet` (optional, `unknown`) and `sheetOptions` (optional,
      `{ label: string, makeDefault?: boolean }`) to `ActorTypeConfigSchema` in
      `packages/types/src/modus/schema.ts`; unit test both present and absent
- [ ] 1.2 [impl] Implement the schema change

## 2. Domain + Foundry registration

- [ ] 2.1 [test] `SystemRegistrar.build` maps `sheet`/`sheetOptions` onto `ActorDeclaration`
- [ ] 2.2 [impl] Implement the mapping
- [ ] 2.3 [adapt] `FoundrySystemRegistrar.applyDescriptor` calls `Actors.registerSheet` for
      any actor declaring a `sheet`
- [ ] 2.4 [smoke] Manual Foundry check: sheet still opens as default after the switch

## 3. dtk-shadowrun conversion completion

- [ ] 3.1 [impl] Add `sheet`/`sheetOptions` to `shadowrunModus` in
      `packages/shadowrun/src/modus.ts`
- [ ] 3.2 [impl] Remove the direct `Actors.registerSheet` call from
      `packages/shadowrun/src/index.ts` — registration goes entirely through
      `defineSystem(modus)`
