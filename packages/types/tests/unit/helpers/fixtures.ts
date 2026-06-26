// Shared fixture factories for @dtk/types tests

export function makeValidRitus() {
  return {
    id: 'sr5e',
    name: 'Shadowrun 5E',
    mechanic: 'pool-count' as const,
    threshold: 5,
    tiers: {
      critical: 4,
      hit: 1,
      glancing: 0,
    },
  }
}

export function makeValidCodex() {
  return {
    systemId: 'sr5e',
    attributes: ['agility', 'body', 'reaction', 'strength', 'charisma', 'intuition', 'logic', 'willpower'],
    skills: ['firearms', 'close-combat', 'running'],
    derived: ['initiative', 'composure', 'judge-intentions', 'memory'],
    damageTypes: ['physical', 'stun'],
    currencies: ['nuyen', 'karma'],
  }
}

export function makeValidModus() {
  return {
    id: 'sr5e',
    schemaVersion: 1,
    actors: {
      character: {
        label: 'Character',
        dataModel: {} as unknown,
      },
    },
  }
}

export function makeValidExemplarBase() {
  return {
    id: 'sr5e-test-rule',
    version: '0.1.0',
    kind: 'rule' as const,
    name: 'Test Rule',
  }
}
