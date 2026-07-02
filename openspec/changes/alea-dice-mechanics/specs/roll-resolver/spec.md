## ADDED Requirements

### Requirement: Mechanic dispatch

The resolver SHALL read `effectiveConfig.mechanic` and route resolution to the corresponding mechanic branch. Unrecognised or deferred mechanic values SHALL log a warning and fall back to `pool-count` logic.

#### Scenario: pool-count routes to hit-count branch

- **WHEN** `effectiveConfig.mechanic` is `"pool-count"` or `"standard"`
- **THEN** the hit-counting branch runs (faces ≥ threshold = hits)

#### Scenario: exploding routes to exploding branch

- **WHEN** `effectiveConfig.mechanic` is `"exploding"`
- **THEN** the roller is invoked with `{ explodes: true }` and faces include all exploded results

#### Scenario: Unknown mechanic falls back with warning

- **WHEN** `effectiveConfig.mechanic` is `"drama-die"`
- **THEN** pool-count logic runs; a console warning names the unsupported mechanic

---

### Requirement: pool-sum resolution branch

When mechanic is `pool-sum` the resolver SHALL sum all rolled faces and classify the sum against `tiers` breakpoints (treating breakpoint values as minimum sums, not hit counts). `hits` in the RollResult SHALL equal the sum for downstream transparency; `netHits` follows the same opposed-roll subtraction rule.

#### Scenario: Sum classified against tier breakpoints

- **WHEN** sum = 14, tiers = { critical: 20, hit: 10, glancing: 5 }
- **THEN** tier = "hit", hits = 14

#### Scenario: Opposed pool-sum subtracts sums

- **WHEN** initiator sum = 14, opposition sum = 8
- **THEN** netHits = 6, tier classified from netHits

---

### Requirement: roll-under resolution branch

When mechanic is `roll-under` the resolver SHALL count faces **strictly below** threshold as hits. All subsequent stages (opposed, tier classification) use the resulting hit count unchanged.

#### Scenario: roll-under counts sub-threshold faces

- **WHEN** mechanic = "roll-under", faces = [3, 7, 2], threshold = 5
- **THEN** hits = 2

---

### Requirement: step-die resolution branch

When mechanic is `step-die` the resolver SHALL call the roller with count = 1 regardless of the pool expression evaluation. The `pool` field in RollResult SHALL be set to 1.

#### Scenario: step-die always rolls one die

- **WHEN** mechanic = "step-die", pool expression = "@strength" evaluates to 6
- **THEN** roller is called with count = 1, sides = effectiveConfig.sides

---

### Requirement: advantage-disadvantage resolution branch

When mechanic is `advantage-disadvantage` the resolver SHALL roll `pool` dice, retain one face per `keepMode` (highest or lowest), and compare only the kept face to threshold. All faces SHALL be stored in `RollResult.faces`; `hits` is 0 or 1.

#### Scenario: advantage keeps highest

- **WHEN** mechanic = "advantage-disadvantage", keepMode = "highest", faces = [3, 15, 8], threshold = 10
- **THEN** kept = 15, hits = 1, RollResult.faces = [3, 15, 8]

#### Scenario: disadvantage keeps lowest

- **WHEN** keepMode = "lowest", faces = [3, 15, 8], threshold = 10
- **THEN** kept = 3, hits = 0

---

### Requirement: target-number resolution branch

When mechanic is `target-number` the resolver SHALL roll one die of `sides` faces, add the floor of the pool expression value as a flat modifier, and compare the total to `threshold`. `hits` = 1 if total ≥ threshold, else 0. `pool` in RollResult SHALL be the modifier value.

#### Scenario: target-number with positive modifier

- **WHEN** mechanic = "target-number", face = 11, pool modifier = 4, threshold = 15
- **THEN** total = 15, hits = 1

#### Scenario: target-number with zero modifier

- **WHEN** pool expression evaluates to null (treated as 0), face = 14, threshold = 15
- **THEN** total = 14, hits = 0

---

### Requirement: mechanic field in RollResult

`RollResult` SHALL include a `mechanic` string field equal to `effectiveConfig.mechanic`. This allows hook subscribers to adapt display logic without re-fetching the ritus configuration.

#### Scenario: mechanic propagated to result

- **WHEN** effectiveConfig.mechanic = "exploding"
- **THEN** RollResult.mechanic = "exploding"

#### Scenario: mechanic field present for all branches

- **WHEN** any mechanic branch executes
- **THEN** RollResult.mechanic is set to the resolved mechanic string (never undefined)
