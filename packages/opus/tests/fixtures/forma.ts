import type { Forma, AdvancementTrack } from '../../src/domain/Forma'

const defaultTracks: AdvancementTrack[] = [
  { id: 'enhanced-strength', title: 'Enhanced Strength', cost: 10 },
  { id: 'quick-reflexes', title: 'Quick Reflexes', cost: 15 },
  { id: 'street-cred', title: 'Street Cred', cost: 5 },
]

export function makeSimpleForma(overrides?: Partial<Forma>): Forma {
  return {
    systemId: 'test-system',
    steps: [
      { id: 'species', title: 'Choose Species', kind: 'choices', from: 'species', max: 1, required: true },
      { id: 'background', title: 'Background', kind: 'free-text', required: false },
    ],
    advancement: { paradigm: 'xp', currency: 'XP', starting: 100, tracks: [] },
    ...overrides,
  }
}

export function makeFormaWithAdvancement(
  paradigm: Forma['advancement']['paradigm'] = 'xp',
  overrides?: Partial<Forma>
): Forma {
  const tracks = [...defaultTracks]
  let advancement: Forma['advancement']

  switch (paradigm) {
    case 'milestone':
      advancement = { paradigm: 'milestone', per_milestone: 2, tracks }
      break
    case 'resource':
      advancement = { paradigm: 'resource', resource: '@actor.system.wealth.gold', currency: 'Gold', tracks }
      break
    case 'practice':
      advancement = { paradigm: 'practice', check_at: 'session_end', check_expression: 'practiceCount >= 1', tracks }
      break
    case 'marks':
      advancement = { paradigm: 'marks', marks_per_session: 3, currency: 'Marks', tracks }
      break
    case 'session':
      advancement = { paradigm: 'session', sessions_per_advance: 2, tracks }
      break
    default:
      advancement = { paradigm: 'xp', currency: 'XP', starting: 100, tracks }
  }

  return {
    systemId: 'test-system',
    steps: [
      { id: 'archetype', title: 'Archetype', kind: 'choices', from: 'archetype', max: 1, required: true },
    ],
    advancement,
    ...overrides,
  }
}

export function makeFormaWithComplexPrerequisites(): Forma {
  return {
    systemId: 'test-system',
    steps: [
      { id: 'attributes', title: 'Attributes', kind: 'point-buy', spend_on: 'attributes', pool: '24', required: true },
    ],
    advancement: {
      paradigm: 'xp',
      currency: 'XP',
      starting: 100,
      tracks: [
        {
          id: 'body-improvement',
          title: 'Body Improvement',
          cost: 10,
          requires: 'floor(@steps.attributes.body / 2) >= 3',
        },
      ],
    },
  }
}
