import { describe, it, expect } from 'vitest'
import { CreationEngine } from '../../src/domain/CreationEngine'
import { StubExemplarQuery } from '../../src/adapters/in-memory/StubExemplarQuery'
import { makeSimpleForma } from '../fixtures/forma'
import type { Forma } from '../../src/domain/Forma'

function engineWithPool(pool: string): CreationEngine {
  const forma: Forma = {
    ...makeSimpleForma(),
    steps: [
      { id: 'attrs', title: 'Attributes', kind: 'point-buy', spend_on: 'attributes', pool, required: true },
    ],
  }
  return new CreationEngine(forma, new StubExemplarQuery())
}

describe('CreationEngine — pool expression evaluation', () => {
  it('numeric string pool evaluates to the number', () => {
    const engine = engineWithPool('10')
    engine.applyChoice('attrs', { str: 5, dex: 5 })
    expect(engine.canFinish()).toBe(true)
  })

  it('arithmetic expression pool (5 + 5) evaluates correctly', () => {
    const engine = engineWithPool('5 + 5')
    engine.applyChoice('attrs', { str: 5, dex: 5 })
    expect(engine.canFinish()).toBe(true)
  })

  it('arithmetic expression pool over-allocation still throws', () => {
    const engine = engineWithPool('5 + 5')
    expect(() => engine.applyChoice('attrs', { str: 11 })).toThrow()
  })

  it('step reference in pool resolved from prior step state', () => {
    const forma: Forma = {
      ...makeSimpleForma(),
      steps: [
        { id: 'species', title: 'Species', kind: 'choices', from: 'species', max: 1, required: true },
        { id: 'attrs', title: 'Attributes', kind: 'point-buy', spend_on: 'attributes', pool: '@species.bonus + 5', required: true },
      ],
    }
    const engine = new CreationEngine(forma, new StubExemplarQuery())
    engine.applyChoice('species', { bonus: 3 })
    // @species.bonus → 3, pool = 3 + 5 = 8
    engine.applyChoice('attrs', { str: 8 })
    expect(engine.canFinish()).toBe(true)
  })

  it('step reference to undefined state defaults to 0', () => {
    const forma: Forma = {
      ...makeSimpleForma(),
      steps: [
        { id: 'attrs', title: 'Attributes', kind: 'point-buy', spend_on: 'attributes', pool: '@missing.value + 5', required: true },
      ],
    }
    const engine = new CreationEngine(forma, new StubExemplarQuery())
    // @missing.value → 0, pool = 0 + 5 = 5
    engine.applyChoice('attrs', { str: 5 })
    expect(engine.canFinish()).toBe(true)
  })

  it('step reference when step value is not an object defaults to 0 in pool', () => {
    const forma: Forma = {
      ...makeSimpleForma(),
      steps: [
        { id: 'species', title: 'Species', kind: 'choices', from: 'species', max: 1, required: true },
        { id: 'attrs', title: 'Attributes', kind: 'point-buy', spend_on: 'attributes', pool: '@species.bonus + 2', required: true },
      ],
    }
    const engine = new CreationEngine(forma, new StubExemplarQuery())
    engine.applyChoice('species', ['elf']) // array, not object with bonus
    // @species.bonus → array, not object → resolves to 0, pool = 0 + 2 = 2
    engine.applyChoice('attrs', { str: 2 })
    expect(engine.canFinish()).toBe(true)
  })

  it('invalid pool expression falls back to 0 — over-allocation with cost 1 over', () => {
    const forma: Forma = {
      ...makeSimpleForma(),
      steps: [
        { id: 'attrs', title: 'Attributes', kind: 'point-buy', spend_on: 'attributes', pool: 'invalid!', required: true },
      ],
    }
    const engine = new CreationEngine(forma, new StubExemplarQuery())
    // pool fallback 0, so any allocation > 0 is over
    expect(() => engine.applyChoice('attrs', { str: 1 })).toThrow()
  })
})
