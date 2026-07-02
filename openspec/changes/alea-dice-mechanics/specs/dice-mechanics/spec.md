## ADDED Requirements

### Requirement: pool-count mechanic

The resolver SHALL roll `pool` dice of `sides` faces and count each face ≥ `threshold` as one hit. Net hits are passed to tier classification.

#### Scenario: Standard pool-count hit counting

- **WHEN** mechanic is `pool-count`, pool = 4, sides = 6, threshold = 5, faces = [6, 5, 3, 2]
- **THEN** hits = 2, faces and pool are preserved in RollResult

#### Scenario: All faces below threshold yields zero hits

- **WHEN** faces = [1, 2, 3, 4] and threshold = 5
- **THEN** hits = 0, tier = "miss"

---

### Requirement: pool-sum mechanic

The resolver SHALL roll `pool` dice of `sides` faces and sum all face values. The sum is compared against `tiers` breakpoints where each breakpoint value is a **minimum sum** (not a hit count). `threshold` is unused for pool-sum.

#### Scenario: Sum meets hit breakpoint

- **WHEN** mechanic is `pool-sum`, faces = [4, 5, 3], sum = 12, tiers = { critical: 16, hit: 10 }
- **THEN** tier = "hit"

#### Scenario: Sum meets critical breakpoint

- **WHEN** sum = 18, tiers = { critical: 16, hit: 10 }
- **THEN** tier = "critical"

#### Scenario: Sum below all breakpoints yields miss

- **WHEN** sum = 5, tiers = { hit: 10 }
- **THEN** tier = "miss"

---

### Requirement: roll-under mechanic

The resolver SHALL roll `pool` dice of `sides` faces and count each face **strictly below** `threshold` as one hit. Remaining resolution (net hits, tier classification) proceeds identically to pool-count.

#### Scenario: Faces below threshold counted as hits

- **WHEN** mechanic is `roll-under`, faces = [2, 7, 3, 8], threshold = 5
- **THEN** hits = 2 (faces 2 and 3 qualify)

#### Scenario: All faces at or above threshold yields zero hits

- **WHEN** faces = [5, 6, 8], threshold = 5
- **THEN** hits = 0

---

### Requirement: exploding mechanic (Fulmen)

The resolver SHALL roll `pool` dice of `sides` faces with the exploding modifier — any die showing its maximum face value is rolled again and its result added to the pool. Each individual face (including all exploded dice) is independently compared to `threshold` for hit counting. Explosion may chain without limit.

#### Scenario: Exploded dice counted individually

- **WHEN** mechanic is `exploding`, pool = 2, sides = 6, threshold = 5, initial faces = [6, 3], explosion yields [5]
- **THEN** faces = [6, 3, 5], hits = 2 (6 and 5 qualify)

#### Scenario: Chain explosion all faces counted

- **WHEN** an exploded die also shows max, triggering a second explosion
- **THEN** all resulting faces are included in the faces array and hit-counted

---

### Requirement: step-die mechanic

The resolver SHALL ignore the `pool` expression and always roll exactly **one** die of `sides` faces. The single face value is compared to `threshold` as a hit (1 hit if face ≥ threshold, 0 otherwise). Net hits and tier classification follow the same rules as pool-count.

#### Scenario: Single die rolled regardless of pool expression

- **WHEN** mechanic is `step-die`, pool expression evaluates to 5, sides = 8, threshold = 6, face = 7
- **THEN** hits = 1, pool field in RollResult = 1

#### Scenario: Step die below threshold yields miss

- **WHEN** face = 3, threshold = 6
- **THEN** hits = 0, tier = "miss"

---

### Requirement: advantage-disadvantage mechanic

The resolver SHALL roll `pool` dice of `sides` faces, retaining **one** die determined by `keepMode`. If `keepMode` is `"highest"`, the maximum face is kept; if `"lowest"`, the minimum face is kept. The kept face is compared to `threshold` for hit counting (1 hit if ≥ threshold). All rolled faces are preserved in RollResult for display; `hits` reflects only the kept die.

#### Scenario: Advantage keeps highest face

- **WHEN** mechanic is `advantage-disadvantage`, keepMode = "highest", pool = 2, faces = [4, 17], threshold = 10
- **THEN** kept face = 17, hits = 1

#### Scenario: Disadvantage keeps lowest face

- **WHEN** keepMode = "lowest", pool = 2, faces = [4, 17], threshold = 10
- **THEN** kept face = 4, hits = 0

#### Scenario: All faces preserved in result

- **WHEN** pool = 3, faces = [8, 14, 2], keepMode = "highest"
- **THEN** RollResult.faces = [8, 14, 2] (all), hits based on kept face 14

---

### Requirement: target-number mechanic

The resolver SHALL roll exactly **one** die of `sides` faces. The face value is compared to `threshold`: if face ≥ threshold the result is a hit (1 hit), otherwise 0 hits. Tier classification proceeds normally. Pool expression is evaluated but used only as a modifier added to the die face before threshold comparison.

#### Scenario: Die face plus modifier meets threshold

- **WHEN** mechanic is `target-number`, face = 12, pool modifier = 3, threshold = 15
- **THEN** modified total = 15, hits = 1

#### Scenario: Die face plus modifier below threshold yields miss

- **WHEN** face = 10, pool modifier = 3, threshold = 15
- **THEN** modified total = 13, hits = 0

#### Scenario: Zero modifier (pool = 0) — face alone compared

- **WHEN** pool expression evaluates to 0, face = 17, threshold = 15
- **THEN** hits = 1

---

### Requirement: standard mechanic alias

The resolver SHALL treat `standard` as an alias for `pool-count`. No distinct resolution logic is applied.

#### Scenario: standard behaves identically to pool-count

- **WHEN** mechanic is `standard`, pool = 3, faces = [6, 4, 2], threshold = 5
- **THEN** hits = 1 (same as pool-count with same inputs)

---

### Requirement: Deferred mechanics logged and fallback applied

For mechanic values `drama-die` and `custom`, the resolver SHALL log a warning that the mechanic is not yet implemented and SHALL fall back to `pool-count` behaviour for the roll.

#### Scenario: drama-die falls back with warning

- **WHEN** mechanic is `drama-die`
- **THEN** pool-count logic applies; a console warning identifies the unsupported mechanic

#### Scenario: custom falls back with warning

- **WHEN** mechanic is `custom`
- **THEN** pool-count logic applies; a console warning identifies the unsupported mechanic
