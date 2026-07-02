import { describe, it, expect } from 'vitest'
import { ModusSchema } from '@eldritchforgeworks/dtk-types'
import { shadowrunModus } from '../src/modus.js'

describe('shadowrunModus', () => {
  it('validates against the Modus schema', () => {
    const result = ModusSchema.safeParse(shadowrunModus)
    expect(result.success).toBe(true)
  })

  it('declares the dtk-shadowrun system id', () => {
    expect(shadowrunModus.id).toBe('dtk-shadowrun')
  })

  it('declares the shadowrunCharacter actor type with a data model', () => {
    const actor = shadowrunModus.actors['dtk-shadowrun.shadowrunCharacter']
    expect(actor).toBeDefined()
    expect(actor?.label).toBe('Shadowrun Character')
    expect(actor?.dataModel).toBeDefined()
  })
})
