## ADDED Requirements

### Requirement: Canonical LevelDB pack encoding

Compiled packs SHALL use Foundry's native LevelDB encoding: keys of the form
`!{collection}!{_id}` where `{collection}` is the Foundry collection name derived
from the pack's document class (Item → `items`, Actor → `actors`), and
JSON-serialized document values. The document's DTK subtype (e.g. `ritus`,
`sequence`) SHALL appear only in the document's `type` field, never in the key.
All DTK pack-producing tools (promptuarium's compendium target, dtk-shadowrun's
pack build) SHALL emit this single encoding.

#### Scenario: Item pack entry keyed by collection

- **WHEN** the compiler writes an entry with `type: "ritus"` and `_id: "abc123"` to an Item-class pack
- **THEN** the LevelDB key is `!items!abc123` and the value parses as JSON with `type: "ritus"`

#### Scenario: Pack loads in Foundry

- **WHEN** a compiled pack directory is declared in a module manifest and Foundry opens the compendium
- **THEN** all compiled documents are listed and openable

#### Scenario: Tooling convergence

- **WHEN** the same source documents are packed by promptuarium and by the shadowrun pack build
- **THEN** both databases contain identical keys and equivalent JSON document values

### Requirement: Sequence pack envelope

Sequence source documents SHALL be compiled into Item pack entries — each
document validated against `MechanicSequenceExemplarSchema` from
`@eldritchforgeworks/dtk-types` — with the fixed envelope
`{_id, name, type: 'dtk.sequence', system, flags}` where `system` is the bare
`MechanicSequenceExemplar` document unchanged — no `fieldMap` remapping — matching
the shape `dtk-shadowrun` ships in
`packages/shadowrun/src/packs/sr-sequences/01-RangedAttack.json` and `dtk-alea`'s
`CompendiumScanner` consumes. `_id` SHALL be a stable id derived from the
sequence's `id` (same derivation as exemplar compilation); `name` SHALL come from
an optional top-level `name` in the source document, falling back to the
sequence `id`.

#### Scenario: Sequence document wrapped in fixed envelope

- **WHEN** the compiler packs a sequence document with `id: "sr.ranged-attack"`
- **THEN** the pack entry has `type: 'dtk.sequence'`, `system.id === "sr.ranged-attack"`, `system.steps` identical to the source, and a stable `_id` derived from `"sr.ranged-attack"`

#### Scenario: Sequence pack loads through alea's scanner

- **WHEN** a compiled sequence pack is enabled in a world where `dtk-alea` is active
- **THEN** the scanner discovers the entries as `dtk.sequence` items with executable `system` payloads
