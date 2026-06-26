# Tasks: dtk-opus

## Group 0: Architecture Scaffold

- [x] [wire] Create hexagonal directory structure: `src/domain/`, `src/ports/`, `src/adapters/foundry/`, `src/adapters/in-memory/`
- [x] [wire] Configure vitest with `coverage.exclude: ["src/adapters/foundry/**"]` and `coverage.thresholds: { lines: 85 }`
- [x] [wire] Create `tests/` directory with `fixtures/` and `helpers/` subdirectories
- [x] [wire] Declare all five port interfaces in `src/ports/`: `IActorBuildStore`, `IExemplarQuery`, `ILexDelegate`, `IWizardRenderer`, `ITrackerRenderer`
- [x] [wire] Write all five in-memory stubs in `src/adapters/in-memory/`: `InMemoryActorBuildStore`, `StubExemplarQuery`, `NullLexDelegate`, `NullWizardRenderer`, `NullTrackerRenderer`
- [x] [wire] Create test fixture factory `tests/fixtures/forma.ts` with `makeSimpleForma()`, `makeFormaWithAdvancement()`, `makeFormaWithComplexPrerequisites()`
- [x] [wire] Create test fixture factory `tests/fixtures/build.ts` with `makeCharacterBuild()`, `makeEmptyBuild()`, `makeBuildWithAdvancements()`

---

## Group 1: FormaRegistry [forma-registry]

- [x] [test] Write `FormaRegistry` unit tests covering: valid Forma stored by system id, duplicate registration warns + overwrites, invalid Forma throws, steps with unique ids pass, duplicate step ids fail validation, valid step id reference in advancement track passes, unknown step id reference fails, registered Forma returned by id, unregistered system returns null (4 groups: Boundary/Scenario/Failure/Combinatorial)
- [x] [impl] Implement `FormaRegistry` domain service: `Map<systemId, Forma>`; `register(systemId, forma)` validates via `FormaSchema.safeParse()`, warns on duplicate, throws on invalid; `get(systemId): Forma | null`
- [x] [impl] Implement `LexApi.registerForma()` and `FormaRegistry.get()` delegation

---

## Group 2: PrerequisiteEvaluator [prerequisite-evaluator]

- [x] [test] Write `PrerequisiteEvaluator` unit tests covering: step equality satisfied/not satisfied, advancement ownership satisfied, AND composition, Lex delegation called for complex expression, complex expression without Lex treated as satisfied + warning, Lex null result treated as satisfied + warning, build unchanged after evaluation, bulk evaluateAll returns all advancements, failed bulk evaluation doesn't abort (4 groups)
- [x] [impl] Implement `PrerequisiteEvaluator` domain service: built-in simple evaluator (step equality/inequality, ownership check, &&/||); `ILexDelegate` delegation fallback; graceful degradation (treat as satisfied) when expression is complex and no delegate; `evaluate(expr, context): boolean`; `evaluateAll(forma, build): Record<string, boolean>`
- [x] [stub] Implement `NullLexDelegate` stub (already in Group 0 — always returns null)

---

## Group 3: CreationEngine [creation-wizard — domain]

- [x] [test] Write `CreationEngine` unit tests covering: steps returned in declaration order, choice step records selection, multi-choice step enforces max, point-buy step deducts from pool, point-buy over-allocation rejected, build valid only when all required steps complete, Finish produces correct CharacterBuild, Cancel returns null (4 groups)
- [x] [impl] Implement `CharacterBuild` value object: `{ systemId, steps: Record<stepId, choice>, advancements: PurchasedAdvancement[], xpSpent, xpTotal }`; serialisable to/from JSON
- [x] [impl] Implement `CreationEngine` domain service: walks `forma.steps[]` in order; `applyChoice(stepId, choice)` updates in-progress build; `canFinish(): boolean` — all required steps have selections; `finish(): CharacterBuild`

---

## Group 4: AdvancementEngine [advancement-tracker — domain]

- [x] [test] Write `AdvancementEngine` unit tests covering all six paradigms: xp gate (sufficient/insufficient), milestone gate (remaining > 0 / = 0), resource gate (live value check), practice gate (practiceLog count meets expression), marks gate (unspent marks), session gate (advancementsRemaining); plus: advancement hidden until unlock step complete, purchased advancement shown as purchased, buy idempotent (re-purchase no-op), paradigmState updated correctly per paradigm after purchase (4 groups)
- [x] [impl] Implement `ParadigmState` discriminated union type: six variants with paradigm-specific fields (xp, milestone, resource, practice, marks, session)
- [x] [impl] Extend `CharacterBuild` value object to replace `xpSpent/xpTotal` with `paradigmState: ParadigmState`
- [x] [impl] Implement `AdvancementEngine` domain service with paradigm strategy dispatch: `canBuy(forma, build, advancementId): boolean` — dispatches gate check per paradigm; `availableAdvancements(forma, build): AdvancementEntry[]` — filtered by unlock state, prerequisites, and gate; `purchase(forma, build, advancementId): CharacterBuild` — validates gate, records advancement, updates paradigmState, returns updated build; pure (no side effects)
- [x] [impl] Implement practice-paradigm session hook: `Hooks.on('updateWorldTime', handler)` — on session end signal, run improvement checks against `practiceLog`, mark eligible advancements as available, reset `practiceLog` to `{}`

---

## Group 5: Foundry Adapters [adapt]

- [x] [adapt] Implement `FoundryActorBuildStore`: reads/writes `actor.flags['dtk-opus'].build` via `Actor#update`; `IActorBuildStore` port
- [x] [adapt] Implement `FoundryExemplarQuery`: calls `game.dtk.api<PromptariumApi>('dtk-promptuarium')?.query(kind)`; falls back to empty array if dtk-promptuarium is absent; `IExemplarQuery` port
- [x] [adapt] Implement `LexDelegateAdapter`: calls `game.dtk.api<LexApi>('dtk-lex')?.evaluate()`; returns null if dtk-lex absent; `ILexDelegate` port

---

## Group 6: Creation Wizard ApplicationV2 [creation-wizard — UI]

- [x] [impl] Implement `CreationWizardApp` as `HandlebarsApplicationMixin(ApplicationV2)` modal: tab navigation per step, Previous/Next/Finish buttons, Finish disabled until `CreationEngine.canFinish()`
- [x] [impl] Implement choice step renderer: card grid from `IExemplarQuery.query(kind)`; selection recording; max enforcement
- [x] [impl] Implement point-buy step renderer: attribute list with `+`/`−` buttons; pool counter; over-allocation prevention; all-points-spent completion check
- [x] [impl] Implement `FoundryWizardRenderer.open(actor, forma, engine): Promise<CharacterBuild | null>`: creates `CreationWizardApp`; resolves on Finish (persists via `IActorBuildStore`) or Cancel
- [x] [impl] Implement `OpusApi.openCreationWizard(actor, systemId)`: validates Forma exists; delegates to `FoundryWizardRenderer`

---

## Group 7: Advancement Tracker ApplicationV2 [advancement-tracker — UI]

- [x] [impl] Implement `AdvancementTrackerApp` as `ApplicationV2` panel: XP summary header; advancement card list; Buy buttons
- [x] [impl] Wire advancement card rendering: `AdvancementEngine.availableAdvancements()` drives the list; purchased advancements shown as greyed-out "Purchased"
- [x] [impl] Wire Buy button: calls `AdvancementEngine.purchase()`; persists updated `CharacterBuild` via `IActorBuildStore`; re-renders panel
- [x] [impl] Implement `FoundryTrackerRenderer.open(actor, forma, build)`: creates/focuses `AdvancementTrackerApp`; `ITrackerRenderer` port
- [x] [impl] Implement `OpusApi.openAdvancementTracker(actor)`: reads build from `IActorBuildStore`; validates Forma exists; delegates to `FoundryTrackerRenderer`

---

## Group 8: Module Init & game.dtk Registration [wire]

- [x] [wire] Implement `module/src/index.ts`: call `game.dtk.register({ id: 'dtk-opus', version, api: opusApi })` on `init`; fire `Hooks.callAll('dtk-opus.ready')` after registration
- [x] [wire] Wire all adapters together: inject `FoundryActorBuildStore`, `FoundryExemplarQuery`, `LexDelegateAdapter`, `FoundryWizardRenderer`, `FoundryTrackerRenderer` into domain services
- [x] [smoke] Manual smoke test: register a minimal 3-step Forma for a test system; call `game.dtk.api('dtk-opus').openCreationWizard(actor, "test-system")`; complete the wizard; verify `actor.flags['dtk-opus'].build` is written with correct step outputs
