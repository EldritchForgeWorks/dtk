import { describe, it, expect } from 'vitest'
import { ModusSchema, ActorTypeConfigSchema, ItemTypeConfigSchema, SettingConfigSchema } from '../../../src/modus/schema.js'
import { isModus } from '../../../src/modus/guards.js'

const validModus = {
  id: 'sr5e',
  schemaVersion: 1,
  actors: {
    character: {
      label: 'Character',
      dataModel: {} as unknown,
    },
  },
}

// ─── Valid Modus ──────────────────────────────────────────────────────────────
describe('Valid Modus', () => {
  it('minimal valid modus (id, schemaVersion, one actor) passes validation', () => {
    const result = ModusSchema.safeParse(validModus)
    expect(result.success).toBe(true)
  })

  it('inferred data matches input when valid', () => {
    const result = ModusSchema.safeParse(validModus)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('sr5e')
      expect(result.data.schemaVersion).toBe(1)
      expect(result.data.actors['character']?.label).toBe('Character')
    }
  })

  it('modus with multiple actors passes validation', () => {
    const result = ModusSchema.safeParse({
      ...validModus,
      actors: {
        character: { label: 'Character', dataModel: {} },
        vehicle: { label: 'Vehicle', dataModel: {} },
        npc: { label: 'NPC', dataModel: {} },
      },
    })
    expect(result.success).toBe(true)
  })

  it('isModus guard returns true for a valid Modus object', () => {
    expect(isModus(validModus)).toBe(true)
  })

  it('isModus guard returns false for null', () => {
    expect(isModus(null)).toBe(false)
  })

  it('isModus guard returns false for a plain string', () => {
    expect(isModus('not-a-modus')).toBe(false)
  })

  it('isModus guard returns false for invalid modus (empty actors)', () => {
    expect(isModus({ ...validModus, actors: {} })).toBe(false)
  })
})

// ─── Empty Actors Rejected ────────────────────────────────────────────────────
describe('Empty actors rejected', () => {
  it('actors record with zero entries is rejected', () => {
    const result = ModusSchema.safeParse({ ...validModus, actors: {} })
    expect(result.success).toBe(false)
  })

  it('actors missing entirely is rejected', () => {
    const { actors: _, ...withoutActors } = validModus
    const result = ModusSchema.safeParse(withoutActors)
    expect(result.success).toBe(false)
  })

  it('actor entry with empty label is rejected', () => {
    const result = ModusSchema.safeParse({
      ...validModus,
      actors: { character: { label: '', dataModel: {} } },
    })
    expect(result.success).toBe(false)
  })

  it('ActorTypeConfigSchema rejects missing label', () => {
    const result = ActorTypeConfigSchema.safeParse({ dataModel: {} })
    expect(result.success).toBe(false)
  })

  it('ActorTypeConfigSchema accepts any dataModel value', () => {
    expect(ActorTypeConfigSchema.safeParse({ label: 'X', dataModel: null }).success).toBe(true)
    expect(ActorTypeConfigSchema.safeParse({ label: 'X', dataModel: 42 }).success).toBe(true)
    expect(ActorTypeConfigSchema.safeParse({ label: 'X', dataModel: { nested: true } }).success).toBe(true)
  })
})

// ─── Missing id Rejected ──────────────────────────────────────────────────────
describe('Missing id rejected', () => {
  it('missing id field is rejected', () => {
    const result = ModusSchema.safeParse({ ...validModus, id: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('id')
    }
  })

  it('empty id string is rejected', () => {
    const result = ModusSchema.safeParse({ ...validModus, id: '' })
    expect(result.success).toBe(false)
  })

  it('id of exactly one character is accepted', () => {
    expect(ModusSchema.safeParse({ ...validModus, id: 'x' }).success).toBe(true)
  })

  it('missing schemaVersion is rejected', () => {
    const result = ModusSchema.safeParse({ ...validModus, schemaVersion: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('schemaVersion')
    }
  })

  it('schemaVersion of 0 is rejected (must be positive)', () => {
    const result = ModusSchema.safeParse({ ...validModus, schemaVersion: 0 })
    expect(result.success).toBe(false)
  })

  it('schemaVersion of -1 is rejected', () => {
    const result = ModusSchema.safeParse({ ...validModus, schemaVersion: -1 })
    expect(result.success).toBe(false)
  })

  it('non-integer schemaVersion (1.5) is rejected', () => {
    const result = ModusSchema.safeParse({ ...validModus, schemaVersion: 1.5 })
    expect(result.success).toBe(false)
  })

  it('schemaVersion of 1 (minimum positive integer) is accepted', () => {
    expect(ModusSchema.safeParse({ ...validModus, schemaVersion: 1 }).success).toBe(true)
  })
})

// ─── Settings Validated ───────────────────────────────────────────────────────
describe('Settings validated', () => {
  const validSetting = {
    key: 'darkMode',
    name: 'Dark Mode',
    hint: 'Enable dark mode UI',
    type: 'boolean' as const,
    default: false,
    scope: 'client' as const,
    config: true,
  }

  it('modus with valid settings array passes validation', () => {
    const result = ModusSchema.safeParse({ ...validModus, settings: [validSetting] })
    expect(result.success).toBe(true)
  })

  it('SettingConfigSchema accepts all valid type values', () => {
    for (const type of ['string', 'number', 'boolean', 'object'] as const) {
      const result = SettingConfigSchema.safeParse({ ...validSetting, type })
      expect(result.success, `type "${type}" should be valid`).toBe(true)
    }
  })

  it('SettingConfigSchema accepts both scope values: world and client', () => {
    expect(SettingConfigSchema.safeParse({ ...validSetting, scope: 'world' }).success).toBe(true)
    expect(SettingConfigSchema.safeParse({ ...validSetting, scope: 'client' }).success).toBe(true)
  })

  it('SettingConfigSchema rejects unknown type value', () => {
    const result = SettingConfigSchema.safeParse({ ...validSetting, type: 'array' })
    expect(result.success).toBe(false)
  })

  it('SettingConfigSchema rejects unknown scope value', () => {
    const result = SettingConfigSchema.safeParse({ ...validSetting, scope: 'global' })
    expect(result.success).toBe(false)
  })

  it('SettingConfigSchema rejects empty key', () => {
    const result = SettingConfigSchema.safeParse({ ...validSetting, key: '' })
    expect(result.success).toBe(false)
  })

  it('SettingConfigSchema rejects empty name', () => {
    const result = SettingConfigSchema.safeParse({ ...validSetting, name: '' })
    expect(result.success).toBe(false)
  })

  it('SettingConfigSchema accepts any default value (string, number, object)', () => {
    expect(SettingConfigSchema.safeParse({ ...validSetting, default: 'hello' }).success).toBe(true)
    expect(SettingConfigSchema.safeParse({ ...validSetting, default: 42 }).success).toBe(true)
    expect(SettingConfigSchema.safeParse({ ...validSetting, default: { nested: true } }).success).toBe(true)
  })

  it('modus with multiple settings passes validation', () => {
    const result = ModusSchema.safeParse({
      ...validModus,
      settings: [
        validSetting,
        { key: 'volume', name: 'Volume', type: 'number', default: 0.8, scope: 'client', config: true },
        { key: 'serverUrl', name: 'Server URL', type: 'string', default: '', scope: 'world', config: false },
      ],
    })
    expect(result.success).toBe(true)
  })
})

// ─── Optional Fields ──────────────────────────────────────────────────────────
describe('Optional fields work', () => {
  it('modus without items is valid', () => {
    const result = ModusSchema.safeParse(validModus)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toBeUndefined()
    }
  })

  it('modus with items passes validation', () => {
    const result = ModusSchema.safeParse({
      ...validModus,
      items: {
        weapon: { label: 'Weapon', dataModel: {} },
        armor: { label: 'Armor', dataModel: {} },
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items?.['weapon']?.label).toBe('Weapon')
    }
  })

  it('ItemTypeConfigSchema rejects empty label', () => {
    const result = ItemTypeConfigSchema.safeParse({ label: '', dataModel: {} })
    expect(result.success).toBe(false)
  })

  it('modus with ritus id string passes validation', () => {
    const result = ModusSchema.safeParse({ ...validModus, ritus: 'sr5e-standard' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ritus).toBe('sr5e-standard')
    }
  })

  it('modus with codex id string passes validation', () => {
    const result = ModusSchema.safeParse({ ...validModus, codex: 'sr5e-codex' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.codex).toBe('sr5e-codex')
    }
  })

  it('modus with forma id string passes validation', () => {
    const result = ModusSchema.safeParse({ ...validModus, forma: 'sr5e-forma' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.forma).toBe('sr5e-forma')
    }
  })

  it('modus with all optional fields populated passes validation', () => {
    const result = ModusSchema.safeParse({
      ...validModus,
      items: { weapon: { label: 'Weapon', dataModel: {} } },
      ritus: 'sr5e-ritus',
      codex: 'sr5e-codex',
      forma: 'sr5e-forma',
      settings: [
        { key: 'darkMode', name: 'Dark Mode', type: 'boolean', default: false, scope: 'client', config: true },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('optional fields ritus, codex, forma are absent when not provided', () => {
    const result = ModusSchema.safeParse(validModus)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ritus).toBeUndefined()
      expect(result.data.codex).toBeUndefined()
      expect(result.data.forma).toBeUndefined()
      expect(result.data.settings).toBeUndefined()
    }
  })
})
