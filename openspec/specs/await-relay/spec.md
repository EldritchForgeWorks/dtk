# await-relay Specification

## Purpose
TBD - created by archiving change dtk-systema. Update Purpose after archive.
## Requirements
### Requirement: Systema listens for dtk-alea.await hook

dtk-systema SHALL register `Hooks.on('dtk-alea.await', handler)` during its `init`.
The hook payload SHALL be:
```
{
  sequenceId: string,
  stepId: string,
  choices: Array<{ id: string, label: string }>,
  actorId: string,
  timeout?: number,
  default?: string
}
```
On receiving this hook, systema SHALL immediately write the pending state to
`Combat.flags['dtk-alea'][sequenceId]` before any socket or UI work.

#### Scenario: dtk-alea.await triggers await relay

- **WHEN** dtk-alea fires `Hooks.callAll('dtk-alea.await', payload)`
- **THEN** systema's hook handler fires and writes the payload to Combat flags

#### Scenario: Pending state persisted before UI

- **WHEN** the await hook fires
- **THEN** `Combat.flags['dtk-alea'][sequenceId]` is set before any socket message or dialog is shown

---

### Requirement: Combat flags persistence

Pending await state SHALL be stored at `Combat.flags['dtk-alea'][sequenceId]` as a
Foundry document update (persisted to the server database and synced to all connected
clients). The entry SHALL include the full hook payload plus a `pendingAt` timestamp.

Cleared entries (after resume or timeout) SHALL be removed via another Combat flag
update, not left as null sentinels.

#### Scenario: Pending state survives client disconnect

- **WHEN** a sequence is awaiting a player decision and that player disconnects and reconnects
- **THEN** `Combat.flags['dtk-alea'][sequenceId]` is still present and the decision dialog re-appears

#### Scenario: Pending state cleared after resume

- **WHEN** dtk-alea.resume() is called with the player's choice
- **THEN** `Combat.flags['dtk-alea'][sequenceId]` is deleted via a Foundry document update

---

### Requirement: Local decision dialog for owned actors

dtk-systema SHALL render a local `ApplicationV2` decision dialog directly — no socket relay needed — when the actor identified by `actorId` is owned by the current user (or is a GM-owned actor and current user is GM). The dialog SHALL present the choices as labelled
buttons. On button click, systema calls
`game.dtk.api<AleaApi>('dtk-alea').resume(sequenceId, choiceId)`.

#### Scenario: Decision dialog renders for owned actor

- **WHEN** the await actorId belongs to the current user's character
- **THEN** an ApplicationV2 decision dialog opens with the choice buttons

#### Scenario: Choice button calls dtk-alea.resume

- **WHEN** the player clicks a choice button in the decision dialog
- **THEN** `AleaApi.resume(sequenceId, choiceId)` is called and the dialog closes

---

### Requirement: GM-relay socket for non-owned actors

If the actor identified by `actorId` is NOT owned by the current user, systema SHALL
emit a Foundry socket message of type `dtk-systema.decision-request` to the GM client.
The GM client receives the message and re-emits it as a socket message of type
`dtk-systema.decision-relay` to the player who owns the actor. That player's client
renders the decision dialog locally. The decision response travels back via socket
type `dtk-systema.decision-response` to the GM, who calls `AleaApi.resume()`.

```
Player A (initiator, no ownership of actorId)
  → socket: dtk-systema.decision-request → GM
GM client
  → socket: dtk-systema.decision-relay → Player B (owns actorId)
Player B
  ← renders decision dialog
  → socket: dtk-systema.decision-response → GM
GM client
  → AleaApi.resume(sequenceId, choiceId)
```

#### Scenario: Non-owned actor decision request routed via GM

- **WHEN** actorId belongs to Player B but the action was triggered by Player A
- **THEN** Player A's client emits a socket request; GM relays it; Player B sees the dialog

#### Scenario: GM relay handles multiple pending decisions

- **WHEN** two sequences simultaneously await decisions for different actors
- **THEN** each is tracked independently by sequenceId; responses are routed correctly

---

### Requirement: Timeout and default choice

If the await payload includes `timeout` (seconds), systema SHALL start a countdown
displayed in the decision dialog. On expiry, if no choice has been made, systema SHALL
apply `default` (if declared) and call `AleaApi.resume(sequenceId, defaultChoiceId)`.
If `default` is absent and timeout expires, systema SHALL call
`AleaApi.resume(sequenceId, null)` signalling a timed-out decision (dtk-alea handles
null as a skip/abort per the sequence definition).

#### Scenario: Timeout fires default choice

- **WHEN** `timeout: 30` and `default: "dodge"` are set and 30 seconds elapse without input
- **THEN** `AleaApi.resume(sequenceId, "dodge")` is called automatically

#### Scenario: Timeout with no default resumes with null

- **WHEN** `timeout: 30` with no `default` and 30 seconds elapse
- **THEN** `AleaApi.resume(sequenceId, null)` is called

---

### Requirement: Reconnect recovery

On the Foundry `ready` hook, systema SHALL inspect `Combat.flags['dtk-alea']` for any
entries whose `actorId` is owned by the current user (or any actor if current user is
GM). For each pending entry that has not expired (no `timeout` set, or `pendingAt` +
`timeout` > now), systema SHALL re-render the decision dialog as if the await hook had
just fired.

#### Scenario: Decision dialog re-appears after reconnect

- **WHEN** a player reconnects while a sequence is awaiting their decision
- **THEN** the decision dialog re-appears with the original choices intact

#### Scenario: Expired pending state is cleaned up on reconnect

- **WHEN** a pending entry's timeout has elapsed before the player reconnects
- **THEN** systema deletes the stale Combat flag entry and does NOT re-render the dialog

