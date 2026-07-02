## 1. @dtk/types — Schema alignment

- [x] 1.1 Replace `RitusMechanicSchema` enum with the 9-value set: `standard`, `pool-count`, `pool-sum`, `exploding`, `step-die`, `roll-under`, `advantage-disadvantage`, `target-number`, `drama-die`, `custom`
- [x] 1.2 Add `sides: z.number().int().min(2)` to `RitusSchema`
- [x] 1.3 Add `explodes: z.boolean()` with default derived from mechanic (`true` when `mechanic === "exploding"`, otherwise `false`) to `RitusSchema`
- [x] 1.4 Add `keepMode: z.enum(["highest", "lowest"])` — required when `mechanic === "advantage-disadvantage"`, optional otherwise — to `RitusSchema` using `.superRefine()`
- [x] 1.5 Update `Ritus` inferred type and re-export; update unit tests for `RitusSchema`

## 2. dtk-alea ports and value objects

- [x] 2.1 Add `keepMode?: 'highest' | 'lowest'` to `RollOpts` in `IDiceRoller.ts`
- [x] 2.2 Add `readonly mechanic: string` field to `RollResult` value object
- [x] 2.3 Add `readonly keepMode?: 'highest' | 'lowest'` to `RitusConfig`

## 3. dtk-alea domain — RollResolver mechanic dispatch

- [x] 3.1 [test] Write failing tests for `pool-sum` branch: faces summed, tiers compared as sums, `mechanic` in result
- [x] 3.2 [impl] Implement `pool-sum` branch in `RollResolver`
- [x] 3.3 [test] Write failing tests for `roll-under` branch: sub-threshold faces counted as hits
- [x] 3.4 [impl] Implement `roll-under` branch in `RollResolver`
- [x] 3.5 [test] Write failing tests for `step-die` branch: always 1 die, pool = 1 in result
- [x] 3.6 [impl] Implement `step-die` branch in `RollResolver`
- [x] 3.7 [test] Write failing tests for `advantage-disadvantage` branch: keepMode highest/lowest, all faces in result
- [x] 3.8 [impl] Implement `advantage-disadvantage` branch in `RollResolver`
- [x] 3.9 [test] Write failing tests for `target-number` branch: face + modifier vs threshold, pool = modifier in result
- [x] 3.10 [impl] Implement `target-number` branch in `RollResolver`
- [x] 3.11 [test] Write failing tests for `exploding` branch: roller called with `{ explodes: true }`, all faces counted
- [x] 3.12 [impl] Wire `exploding` branch through dispatch (roller opts already handled; ensure mechanic field set in result)
- [x] 3.13 [test] Write failing test: unknown mechanic (`drama-die`, `custom`) falls back to pool-count with console warning
- [x] 3.14 [impl] Add fallback + warning for deferred mechanics
- [x] 3.15 [impl] Add `mechanic` field to all `RollResult` objects returned by the resolver

## 4. dtk-alea adapters — FoundryDiceRoller and CompendiumScanner

- [x] 4.1 Add `keepMode` to `FoundryDiceRoller.roll()` — use `kh1` (keep-highest-1) or `kl1` (keep-lowest-1) Foundry formula modifier when `opts.keepMode` is set
- [x] 4.2 Update `CompendiumScanner` to read `item.system.keepMode` and pass it when registering by UUID
- [x] 4.3 Verify `CompendiumScanner` defaults: `sides ?? 6`, `explodes ?? (mechanic === 'exploding')`, `keepMode ?? undefined`

## 5. dtk-alea — SequenceExecutor step emit

- [x] 5.1 Add `mechanic` field to the `dtk-alea.step` hook payload emitted by `SequenceExecutor`

## 6. dtk-runeforge — Pack updates

- [x] 6.1 Add `"sides": 6` and `"explodes": false` to `standard-pool.json` ritus source (already done — verify)
- [x] 6.2 Recompile all dtk-runeforge packs after any ritus source changes
- [x] 6.3 Add a second demonstration ritus: `fulmen-pool.json` with `"mechanic": "exploding"`, `"sides": 6`, `"explodes": true`, same tiers

## 7. Smoke tests

- [ ] 7.1 F5 reload Foundry; confirm CompendiumScanner registers standard-pool with `sides: 6`, `explodes: false`
- [ ] 7.2 Roll via console with standard-pool actor — confirm chat card shows dice and tier
- [ ] 7.3 Swap ritus to fulmen-pool; confirm exploding dice appear in card (extra dice when 6 rolled)
