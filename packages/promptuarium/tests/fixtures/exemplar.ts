import type {
  RuleExemplar,
  SequenceExemplar,
  ActionExemplar,
  SpeciesExemplar,
  DisciplineExemplar,
  ArchetypeExemplar,
} from '@eldritchforgeworks/dtk-types/exemplar';

export function makeRuleExemplar(overrides?: Partial<RuleExemplar>): RuleExemplar {
  return {
    id: 'rule-ranged-attack',
    version: '0.1.0',
    kind: 'rule',
    name: 'Ranged Attack',
    pool: 'agility',
    ritus: 'standard-roll',
    on_tier: {
      hit: { damage: '1' },
      critical: { damage: '3' },
    },
    ...overrides,
  };
}

export function makeSequenceExemplar(overrides?: Partial<SequenceExemplar>): SequenceExemplar {
  return {
    id: 'seq-full-attack',
    version: '0.1.0',
    kind: 'sequence',
    name: 'Full Attack',
    steps: [{ id: 'step-1', rule: 'rule-ranged-attack' }],
    ...overrides,
  };
}

export function makeActionExemplar(overrides?: Partial<ActionExemplar>): ActionExemplar {
  return {
    id: 'action-shoot',
    version: '0.1.0',
    kind: 'action',
    name: 'Shoot',
    sequence: 'seq-full-attack',
    targeting: { mode: 'self' },
    ...overrides,
  };
}

export function makeSpeciesExemplar(overrides?: Partial<SpeciesExemplar>): SpeciesExemplar {
  return {
    id: 'species-elf',
    version: '0.1.0',
    kind: 'species',
    name: 'Elf',
    grants: [],
    ...overrides,
  };
}

export function makeArchetypeExemplar(overrides?: Partial<ArchetypeExemplar>): ArchetypeExemplar {
  return {
    id: 'archetype-street-samurai',
    version: '0.1.0',
    kind: 'archetype',
    name: 'Street Samurai',
    grants: [],
    ...overrides,
  };
}

export function makeDisciplineExemplar(overrides?: Partial<DisciplineExemplar>): DisciplineExemplar {
  return {
    id: 'discipline-warrior',
    version: '0.1.0',
    kind: 'discipline',
    name: 'Warrior',
    parent: 'archetype-street-samurai',
    grants: [],
    ...overrides,
  };
}
