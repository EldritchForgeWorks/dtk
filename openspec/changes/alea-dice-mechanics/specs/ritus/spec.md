## MODIFIED Requirements

### Requirement: Ritus mechanic type

A Ritus SHALL declare a `mechanic` discriminator from the fixed enumeration of supported dice mechanics. Valid values: `standard`, `pool-count`, `pool-sum`, `exploding`, `step-die`, `roll-under`, `advantage-disadvantage`, `target-number`, `drama-die`, `custom`.

`standard` is an alias for `pool-count`. `drama-die` and `custom` are accepted but produce a runtime warning and fall back to `pool-count` pending full implementation.

#### Scenario: Known mechanic accepted

- **WHEN** a Ritus declares `mechanic: "pool-count"`
- **THEN** the Zod validator accepts it

#### Scenario: exploding mechanic accepted

- **WHEN** a Ritus declares `mechanic: "exploding"`
- **THEN** the Zod validator accepts it

#### Scenario: advantage-disadvantage accepted

- **WHEN** a Ritus declares `mechanic: "advantage-disadvantage"`
- **THEN** the Zod validator accepts it

#### Scenario: Unknown mechanic rejected

- **WHEN** a Ritus declares `mechanic: "dice-fest"`
- **THEN** the Zod validator returns an error listing valid values

---

## ADDED Requirements

### Requirement: Die sides field

A Ritus SHALL declare a positive integer `sides` field specifying the number of faces on each die rolled by this mechanic. Minimum value: 2.

#### Scenario: Valid sides accepted

- **WHEN** a Ritus declares `sides: 6`
- **THEN** the Zod validator accepts it

#### Scenario: sides of 1 rejected

- **WHEN** a Ritus declares `sides: 1`
- **THEN** the Zod validator returns an error — minimum is 2

#### Scenario: Non-integer sides rejected

- **WHEN** a Ritus declares `sides: 6.5`
- **THEN** the Zod validator returns an error

---

### Requirement: Explodes flag

A Ritus SHALL declare an `explodes` boolean field. When `true`, dice that show their maximum face value are re-rolled and the additional result added to the pool. `explodes` SHALL default to `true` when `mechanic` is `"exploding"` and to `false` for all other mechanics unless explicitly overridden.

#### Scenario: explodes true on exploding mechanic

- **WHEN** a Ritus declares `mechanic: "exploding"` and omits `explodes`
- **THEN** `explodes` resolves to `true`

#### Scenario: explodes false on pool-count by default

- **WHEN** a Ritus declares `mechanic: "pool-count"` and omits `explodes`
- **THEN** `explodes` resolves to `false`

#### Scenario: explodes can be explicitly set false on exploding mechanic

- **WHEN** a Ritus declares `mechanic: "exploding"` and `explodes: false`
- **THEN** the Zod validator accepts it and no explosion occurs

---

### Requirement: keepMode field for advantage-disadvantage

A Ritus with `mechanic: "advantage-disadvantage"` SHALL declare a `keepMode` field of `"highest"` or `"lowest"`. For all other mechanics `keepMode` is optional and ignored.

#### Scenario: keepMode required for advantage-disadvantage

- **WHEN** a Ritus declares `mechanic: "advantage-disadvantage"` without `keepMode`
- **THEN** the Zod validator returns an error

#### Scenario: keepMode highest accepted

- **WHEN** `mechanic: "advantage-disadvantage"` and `keepMode: "highest"`
- **THEN** the Zod validator accepts it

#### Scenario: keepMode ignored for pool-count

- **WHEN** `mechanic: "pool-count"` and `keepMode` is absent
- **THEN** the Zod validator accepts it without error
