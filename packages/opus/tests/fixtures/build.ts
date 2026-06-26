import type { CharacterBuild } from '../../src/domain/CharacterBuild'

export function makeCharacterBuild(overrides?: Partial<CharacterBuild>): CharacterBuild {
  return {
    systemId: 'test-system',
    steps: { archetype: 'street-samurai', metatype: 'human' },
    advancements: [],
    paradigmState: { paradigm: 'xp', currency: 'XP', total: 100, spent: 0 },
    ...overrides,
  }
}

export function makeEmptyBuild(systemId = 'test-system'): CharacterBuild {
  return {
    systemId,
    steps: {},
    advancements: [],
    paradigmState: { paradigm: 'xp', currency: 'XP', total: 0, spent: 0 },
  }
}

export function makeBuildWithAdvancements(ids: string[]): CharacterBuild {
  return {
    systemId: 'test-system',
    steps: { archetype: 'street-samurai' },
    advancements: ids.map(id => ({ id, purchasedAt: 0 })),
    paradigmState: { paradigm: 'xp', currency: 'XP', total: 100, spent: ids.length * 10 },
  }
}
