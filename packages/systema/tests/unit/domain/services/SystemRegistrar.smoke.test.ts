import { describe, it, expect } from 'vitest'
import { SystemRegistrar } from '../../../../src/domain/services/SystemRegistrar.js'
import { SystemaError } from '../../../../src/errors.js'

/**
 * Domain-level smoke test for the defineSystem() path (see openspec change
 * add-define-system-smoke-test).
 *
 * Feeds a full, realistic Modus — modeled on dtk-shadowrun's actual actor
 * type and settings — through SystemRegistrar.build(modus) and asserts the
 * resulting descriptor, without touching Foundry globals (per house rule,
 * src/adapters/foundry/ is smoke-tested manually only; this exercises the
 * domain half).
 *
 * KNOWN GAP (recorded, not fixed here — see follow-up change
 * add-modus-sheet-declaration): the current ModusSchema / RegistrationDescriptor
 * has no way to express a Sheet class or sheetOptions. dtk-shadowrun still
 * registers its ActorSheet directly via Actors.registerSheet() outside of
 * defineSystem(). This test therefore only asserts what Modus can actually
 * express today: actor data model registration and settings.
 */

// A stand-in for a Foundry TypeDataModel constructor. SystemRegistrar treats
// dataModel as `unknown` (Modus schema can't validate Foundry classes), so any
// object shape is representative here.
class FakeShadowrunCharacterData {
  static defineSchema(): Record<string, unknown> {
    return { body: {}, agility: {}, reaction: {}, strength: {} }
  }
}

const SHADOWRUN_SHAPED_MODUS = {
  id: 'dtk-shadowrun',
  schemaVersion: 1,
  actors: {
    'dtk-shadowrun.shadowrunCharacter': {
      label: 'Shadowrun Character',
      dataModel: FakeShadowrunCharacterData,
    },
  },
  settings: [
    {
      key: 'showCyberpunkTheme',
      name: 'Cyberpunk Theme',
      hint: 'Apply the neon cyberpunk sheet theme',
      type: 'boolean' as const,
      default: true,
      scope: 'client' as const,
      config: true,
    },
  ],
}

describe('SystemRegistrar — full-Modus smoke test (shadowrun-shaped)', () => {
  it('validates a realistic shadowrun-shaped Modus', () => {
    expect(SystemRegistrar.validate(SHADOWRUN_SHAPED_MODUS)).toBe(true)
  })

  it('produces a complete descriptor: data model keys registered', () => {
    const descriptor = SystemRegistrar.build(SHADOWRUN_SHAPED_MODUS)
    expect(descriptor.systemId).toBe('dtk-shadowrun')
    expect(descriptor.actors).toHaveLength(1)
    expect(descriptor.actors[0]?.type).toBe('dtk-shadowrun.shadowrunCharacter')
    expect(descriptor.actors[0]?.label).toBe('Shadowrun Character')
    expect(descriptor.actors[0]?.dataModel).toBe(FakeShadowrunCharacterData)
  })

  it('produces a complete descriptor: settings registered', () => {
    const descriptor = SystemRegistrar.build(SHADOWRUN_SHAPED_MODUS)
    expect(descriptor.settings).toHaveLength(1)
    expect(descriptor.settings[0]?.key).toBe('showCyberpunkTheme')
    expect(descriptor.settings[0]?.scope).toBe('client')
  })

  it('produces no item declarations when the Modus declares none (shadowrun has no items yet)', () => {
    const descriptor = SystemRegistrar.build(SHADOWRUN_SHAPED_MODUS)
    expect(descriptor.items).toHaveLength(0)
  })

  it('rejects a Modus missing a required actor dataModel-bearing entry', () => {
    const broken = { id: 'dtk-shadowrun', schemaVersion: 1, actors: {} }
    expect(() => SystemRegistrar.build(broken)).toThrow(SystemaError)
  })
})
