import { describe, expect, it } from 'vitest'
import { MechanicSequenceExemplarSchema, MechanicSequenceStepSchema } from '../../../src/sequence/schema.js'

describe('MechanicAwaitStepSchema on_skip', () => {
  it('accepts an await step with on_skip.message', () => {
    const result = MechanicSequenceStepSchema.safeParse({
      type: 'await',
      id: 'await-soak',
      choices: ['roll-soak'],
      condition: { field: '@steps.attack.hits', op: 'gt', value: 0 },
      on_skip: { message: 'Shot deflected.' },
    })
    expect(result.success).toBe(true)
    if (result.success && result.data.type === 'await') {
      expect(result.data.on_skip).toEqual({ message: 'Shot deflected.' })
    }
  })

  it('round-trips on_skip through a full sequence document (regression: previously silently stripped)', () => {
    const doc = {
      id: 'sr.ranged-attack',
      systemId: 'shadowrun',
      steps: [
        {
          type: 'await',
          id: 'await-soak',
          choices: ['roll-soak'],
          on_skip: { message: 'Shot deflected.' },
        },
      ],
    }
    const result = MechanicSequenceExemplarSchema.safeParse(doc)
    expect(result.success).toBe(true)
    if (result.success) {
      const step = result.data.steps[0]
      expect(step?.type).toBe('await')
      if (step?.type === 'await') {
        expect(step.on_skip?.message).toBe('Shot deflected.')
      }
    }
  })

  it('await steps without on_skip still validate (optional field)', () => {
    const result = MechanicSequenceStepSchema.safeParse({
      type: 'await',
      id: 'await-defense',
      choices: ['roll-defense'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-string on_skip.message', () => {
    const result = MechanicSequenceStepSchema.safeParse({
      type: 'await',
      id: 'await-soak',
      choices: ['roll-soak'],
      on_skip: { message: 42 },
    })
    expect(result.success).toBe(false)
  })
})
