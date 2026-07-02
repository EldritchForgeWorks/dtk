# opus-api Specification

## Purpose
TBD - created by archiving change dtk-opus. Update Purpose after archive.
## Requirements
### Requirement: OpusApi registered with game.dtk on init

On `init`, dtk-opus SHALL call `game.dtk.register({ id: 'dtk-opus', version, api: opusApi })`.
The `api` object SHALL implement `OpusApi` from `@eldritchforgeworks/dtk-types/apis`. After registration,
dtk-opus SHALL fire `Hooks.callAll('dtk-opus.ready')`.

#### Scenario: OpusApi accessible via game.dtk after init

- **WHEN** dtk-opus's `init` hook has fired
- **THEN** `game.dtk.api<OpusApi>('dtk-opus')?.registerForma` is callable

#### Scenario: dtk-opus.ready fires after registration

- **WHEN** `game.dtk.register()` completes
- **THEN** `Hooks.callAll('dtk-opus.ready')` is emitted

---

### Requirement: OpusApi.getBuild() reads CharacterBuild from actor flags

`OpusApi.getBuild(actor: Actor): CharacterBuild | null` SHALL read
`actor.flags['dtk-opus']?.build` and return it. Returns `null` if the flag is absent
or malformed.

#### Scenario: Returns build from actor flags

- **WHEN** an actor has a valid `dtk-opus` build flag
- **THEN** `getBuild(actor)` returns the `CharacterBuild`

#### Scenario: Returns null for actor with no build flag

- **WHEN** an actor has no `dtk-opus` flag
- **THEN** `getBuild(actor)` returns `null`

#### Scenario: Returns null for malformed build flag

- **WHEN** `actor.flags['dtk-opus'].build` is not a valid `CharacterBuild` shape
- **THEN** `getBuild(actor)` returns `null` without throwing

---

### Requirement: OpusApi.triggerMilestone() for milestone and session paradigms

`OpusApi.triggerMilestone(actorOrAll: Actor | "all"): void` SHALL be called by the GM
(via macro or game system hook) to grant advancement opportunities. For `paradigm: milestone`,
it increments `paradigmState.advancementsRemaining` by `forma.advancement.per_milestone`.
For `paradigm: session`, it increments `paradigmState.sessionsCompleted` by 1 and
recalculates `advancementsRemaining`. For other paradigms it is a no-op. GM-only — the
method SHALL check `game.user.isGM` and throw a descriptive error if called by a player.

#### Scenario: triggerMilestone grants advancement slots for milestone paradigm

- **WHEN** the GM calls `OpusApi.triggerMilestone(actor)` with `per_milestone: 3`
- **THEN** `paradigmState.advancementsRemaining` increases by 3; tracker reflects new count

#### Scenario: triggerMilestone increments session count for session paradigm

- **WHEN** the GM calls `OpusApi.triggerMilestone(actor)` for a session-paradigm system
- **THEN** `sessionsCompleted` increments by 1; `advancementsRemaining` recalculates

#### Scenario: triggerMilestone blocked for non-GM

- **WHEN** a player calls `OpusApi.triggerMilestone()` (not GM)
- **THEN** a descriptive error is thrown; no flag update occurs

#### Scenario: triggerMilestone with "all" applies to all actors in world

- **WHEN** `OpusApi.triggerMilestone("all")` is called
- **THEN** all actors with a `dtk-opus` build for the relevant system are updated

---

### Requirement: dtk-opus degrades gracefully without dtk-lex

dtk-opus SHALL degrade gracefully when dtk-lex is not installed (`game.dtk.isInstalled('dtk-lex')` is false):
- `openCreationWizard()` and `openAdvancementTracker()` still work — only simple prerequisites are evaluated
- Complex prerequisites are treated as satisfied (console warning logged)
- No error is thrown on init or during the wizard flow

#### Scenario: Wizard completes with simple prerequisites when dtk-lex absent

- **WHEN** dtk-lex is not installed and the Forma only uses simple prerequisites
- **THEN** the wizard completes normally without error

#### Scenario: Complex prerequisite without dtk-lex treated as satisfied

- **WHEN** an advancement has a complex prerequisite expression and dtk-lex is absent
- **THEN** the advancement is shown as available; a console warning names the expression

---

### Requirement: OpusApi surface summary

The full `OpusApi` interface SHALL be exposed via `game.dtk` with the following methods:

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerForma` | `(systemId, forma) => void` | Register a Forma schema |
| `openCreationWizard` | `(actor, systemId) => Promise<CharacterBuild\|null>` | Open creation wizard |
| `openAdvancementTracker` | `(actor) => void` | Open advancement tracker panel |
| `getBuild` | `(actor) => CharacterBuild\|null` | Read actor's current build |
| `triggerMilestone` | `(actorOrAll) => void` | GM: grant advancement slots (milestone/session paradigms) |
| `isReady` | `boolean` | Whether init has completed |

#### Scenario: OpusApi members all accessible after init

- **WHEN** dtk-opus's `init` hook has fired
- **THEN** all six members (`registerForma`, `openCreationWizard`, `openAdvancementTracker`, `getBuild`, `triggerMilestone`, `isReady`) are present on `game.dtk.api<OpusApi>('dtk-opus')`

