# Spec: sequence-executor

The sequence executor walks a Sequence Exemplar's step list, dispatches each step
to the roll resolver, evaluates conditions, handles await suspension, and applies
on-tier consequences.

## ADDED Requirements

### Requirement: Step dispatch and output accumulation

For each step in the sequence, the executor SHALL:
1. Evaluate the step's `condition` (if present) — skip the step if false, write a null sentinel to `stepOutputs[stepId]`
2. Dispatch to `RollResolver` for `rule` steps
3. Store the `RollResult` in `SequenceExecution.stepOutputs[stepId]`
4. Emit `dtk-alea.step` via `IHookEmitter`
5. Advance to the next step

#### Scenario: All steps execute in order

- **WHEN** a sequence has three steps with no conditions or awaits
- **THEN** steps execute sequentially; each step's output is in `stepOutputs`

#### Scenario: Step with false condition is skipped

- **WHEN** a step has `condition: { field: "@steps.attack.tier", op: "neq", value: "miss" }` and the attack was a miss
- **THEN** the step is skipped; `stepOutputs[stepId] = null`

#### Scenario: Skipped step does not block sequence

- **WHEN** step 2 is skipped
- **THEN** step 3 still executes

---

### Requirement: Await step — suspend and emit

When a step has an `await` spec, the executor SHALL:
1. Write the current `SequenceExecution` state to `ICombatStateStore`
2. Emit `dtk-alea.await` via `IHookEmitter` with the full payload
3. Return without executing further steps

On `AleaApi.resume(sequenceId, choice)`:
1. Load `SequenceExecution` from `ICombatStateStore`
2. Record `stepOutputs[stepId + '.choice'] = choice`
3. Continue from the step after the await

#### Scenario: Await step suspends execution

- **WHEN** a sequence step has an `await` spec and execution reaches it
- **THEN** `ICombatStateStore.save()` is called; `dtk-alea.await` is emitted; execution stops

#### Scenario: Resume continues from the step after await

- **WHEN** `AleaApi.resume(sequenceId, "dodge")` is called
- **THEN** execution continues from the step after the suspended await step; `"dodge"` is in `stepOutputs`

#### Scenario: Resume with null choice (timeout)

- **WHEN** `AleaApi.resume(sequenceId, null)` is called
- **THEN** execution continues; `stepOutputs[awaitStepId + '.choice'] = null`

---

### Requirement: On-tier consequence application

After each rule step resolves to a tier, the executor SHALL read the Rule Exemplar's
`on_tier[tierName]` entry and apply:
- `damage` — evaluate formula expression, emit `dtk-alea.step` with damage value
- `chain` — execute the named chain definition (pool + mechanic) inline as a sub-roll
- `effect` — record the effect Exemplar id in stepOutputs for dtk-systema to apply
- `message` — include localised string in the `dtk-alea.step` hook payload

#### Scenario: Hit tier consequence applies damage formula

- **WHEN** rule resolves to `"hit"` tier and `on_tier.hit.damage = "@net_hits + @weapon.damage"`
- **THEN** the damage formula is evaluated and included in the `dtk-alea.step` payload

#### Scenario: Miss tier with no on_tier entry is a no-op

- **WHEN** rule resolves to `"miss"` and no `on_tier.miss` is declared
- **THEN** no consequence is applied; `dtk-alea.step` emits with tier = `"miss"` and no damage

---

### Requirement: dtk-alea.complete hook on sequence end

When all steps have executed (including chains, excluding suspended-await mid-sequence),
the executor SHALL emit `dtk-alea.complete` via `IHookEmitter` with the full
`SequenceExecution` state and remove the entry from `ICombatStateStore`.

#### Scenario: complete fires after last step

- **WHEN** the final step of a sequence executes without suspension
- **THEN** `dtk-alea.complete` is emitted; `ICombatStateStore.delete(sequenceId)` is called

#### Scenario: complete does not fire during suspension

- **WHEN** a sequence suspends at an await step
- **THEN** `dtk-alea.complete` is NOT emitted until after resume and the remaining steps finish
