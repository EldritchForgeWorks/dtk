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
