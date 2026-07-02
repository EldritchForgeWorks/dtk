## ADDED Requirements

### Requirement: AleaApi.executeByRef — roll by compendium UUID
`AleaApi` SHALL expose `executeByRef(sequenceUUID: string, actorId: string, targetIds: string[]): Promise<void>`. The method SHALL:
1. Retrieve the `SequenceExemplar` from `SequenceExemplarRegistry` by UUID
2. Obtain `ActorSnapshot` and target snapshots via the `IActorRepository` port
3. Construct a `RollContext` and pass it to `SequenceExecutor.execute()`

#### Scenario: Valid UUID triggers roll pipeline
- **WHEN** `alea.executeByRef("Compendium.my-system.sequences.sEq1Strike001xyz", actorId, [])` is called
- **THEN** the sequence executes and `dtk-alea.step` is emitted for each rule step

#### Scenario: Unknown UUID throws descriptive error
- **WHEN** `alea.executeByRef("Compendium.my-system.sequences.nonexistent", actorId, [])` is called
- **THEN** a descriptive error is thrown: `"SequenceExemplarRegistry: no sequence registered for UUID …"`

#### Scenario: Unknown actorId throws descriptive error
- **WHEN** a valid UUID is provided but `actorId` does not resolve to a known actor
- **THEN** a descriptive error is thrown identifying the missing actor

---

### Requirement: SequenceExemplarRegistry — in-memory UUID store
`SequenceExemplarRegistry` SHALL store `SequenceExemplar` objects keyed by Foundry UUID string. It SHALL provide:
- `register(uuid: string, exemplar: SequenceExemplar): void`
- `getByUUID(uuid: string): SequenceExemplar | null`
- `all(): ReadonlyMap<string, SequenceExemplar>`

#### Scenario: Registered exemplar retrievable by UUID
- **WHEN** `register("Compendium.my-system.sequences.abc", exemplar)` is called
- **THEN** `getByUUID("Compendium.my-system.sequences.abc")` returns the exemplar

#### Scenario: Unregistered UUID returns null
- **WHEN** `getByUUID("Compendium.unknown.sequences.xyz")` is called on an empty registry
- **THEN** `null` is returned without throwing
