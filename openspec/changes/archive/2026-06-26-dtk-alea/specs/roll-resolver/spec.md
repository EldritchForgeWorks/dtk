# Spec: roll-resolver

The roll resolver runs the six-stage pipeline for a single Rule step: assemble pool
from expression → roll dice → count hits → oppose (if applicable) → compute net hits
→ classify into outcome tier.

## ADDED Requirements

### Requirement: Pool assembly from expression string

The resolver SHALL evaluate the Rule's `pool` expression string using `ExpressionParser`
to produce an integer die count. If the expression evaluates to a non-integer, it SHALL
be floored to the nearest integer. If it evaluates to zero or negative, the resolver
SHALL skip rolling and classify the result as a `"miss"` tier directly.

#### Scenario: Pool expression resolves to integer

- **WHEN** `pool: "@agility + @skill.firearms"` evaluates to 8
- **THEN** 8 dice are rolled

#### Scenario: Negative pool classified as miss

- **WHEN** pool expression evaluates to -2
- **THEN** no dice are rolled; result tier is `"miss"`

#### Scenario: Null pool (Lex absent, complex expression) treated as zero

- **WHEN** the expression parser returns null for an unsupported expression
- **THEN** pool is treated as 0; result tier is `"miss"`; a console warning is emitted

---

### Requirement: Hit counting against threshold

After rolling, the resolver SHALL count faces that are `≥ threshold` (from resolved
`RitusConfig.threshold`) as hits.

#### Scenario: Hits counted correctly

- **WHEN** dice faces are `[6, 5, 3, 1, 5]` and threshold is `5`
- **THEN** hits = 3

#### Scenario: Zero hits when all faces below threshold

- **WHEN** dice faces are `[1, 2, 3]` and threshold is `5`
- **THEN** hits = 0

---

### Requirement: Opposed roll computation

If the Rule Exemplar declares `opposed`, the resolver SHALL evaluate the `opposed`
expression and roll a second pool for the opposition. Net hits = max(0, initiator hits
− opposition hits). If `opposed` is absent, net hits = initiator hits.

#### Scenario: Net hits computed for opposed roll

- **WHEN** initiator rolls 4 hits and opposition rolls 2 hits
- **THEN** net hits = 2

#### Scenario: Net hits floored at zero

- **WHEN** initiator rolls 1 hit and opposition rolls 3 hits
- **THEN** net hits = 0 (not negative)

#### Scenario: Unopposed net hits equal initiator hits

- **WHEN** no `opposed` field is declared on the Rule
- **THEN** net hits = initiator hits

---

### Requirement: Tier classification

The resolver SHALL pass net hits to `TierResolver.classify(netHits, ritusConfig)`
which returns the tier name string (`"critical"`, `"hit"`, `"glancing"`, or `"miss"`)
by comparing net hits against the resolved tiers config breakpoints.

#### Scenario: Net hits above critical threshold classified as critical

- **WHEN** net hits = 5 and `tiers.critical = 4`
- **THEN** tier = `"critical"`

#### Scenario: Net hits in hit band classified as hit

- **WHEN** net hits = 2 and `tiers: { critical: 4, hit: 1, glancing: 0 }`
- **THEN** tier = `"hit"`

#### Scenario: Zero net hits with glancing threshold = 0 classified as glancing

- **WHEN** net hits = 0 and `tiers.glancing = 0`
- **THEN** tier = `"glancing"`

#### Scenario: Net hits below glancing classified as miss

- **WHEN** net hits = 0 and no `glancing` tier is declared
- **THEN** tier = `"miss"`

---

### Requirement: RollResult value object

The resolver SHALL return an immutable `RollResult`: `{ hits, opposedHits, netHits, tier, faces, pool }`.
`opposedHits` is `null` for unopposed rolls. The value object is passed to the
`SequenceExecutor` to populate `@steps.{id}.*` references.

#### Scenario: RollResult fields populated for opposed roll

- **WHEN** an opposed roll produces initiator hits=4, opposed hits=2, net=2, tier="hit"
- **THEN** `RollResult = { hits: 4, opposedHits: 2, netHits: 2, tier: "hit", faces: [...], pool: 8 }`
