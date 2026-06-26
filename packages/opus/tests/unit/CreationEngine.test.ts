import { describe, it, expect } from 'vitest'
import { CreationEngine } from '../../src/domain/CreationEngine'
import { StubExemplarQuery } from '../../src/adapters/in-memory/StubExemplarQuery'
import { makeSimpleForma } from '../fixtures/forma'

function makeEngine() {
  return new CreationEngine(makeSimpleForma(), new StubExemplarQuery())
}

describe('CreationEngine', () => {
  describe('Group 1', () => {
    it('steps returned in declaration order', () => {
      const engine = makeEngine()
      const steps = engine.steps()
      expect(steps[0].id).toBe('species')
      expect(steps[1].id).toBe('background')
    })

    it('choice step records selection', () => {
      const engine = makeEngine()
      engine.applyChoice('species', ['elf'])
      expect(engine.getStepState('species')).toEqual(['elf'])
    })

    it('multi-choice step enforces max', () => {
      const engine = makeEngine()
      expect(() => engine.applyChoice('species', ['elf', 'human'])).toThrow()
    })

    it('point-buy step deducts from pool', () => {
      const forma = makeSimpleForma({
        steps: [
          { id: 'attrs', title: 'Attrs', kind: 'point-buy', spend_on: 'attributes', pool: '10', required: true },
        ],
      })
      const engine = new CreationEngine(forma, new StubExemplarQuery())
      engine.applyChoice('attrs', { str: 5, dex: 5 })
      expect(engine.getStepState('attrs')).toEqual({ str: 5, dex: 5 })
    })

    it('point-buy over-allocation rejected', () => {
      const forma = makeSimpleForma({
        steps: [
          { id: 'attrs', title: 'Attrs', kind: 'point-buy', spend_on: 'attributes', pool: '5', required: true },
        ],
      })
      const engine = new CreationEngine(forma, new StubExemplarQuery())
      expect(() => engine.applyChoice('attrs', { str: 6 })).toThrow()
    })

    it('build valid only when all required steps complete', () => {
      const engine = makeEngine()
      expect(engine.canFinish()).toBe(false)
      engine.applyChoice('species', ['human'])
      expect(engine.canFinish()).toBe(true)
    })

    it('Finish produces correct CharacterBuild', () => {
      const engine = makeEngine()
      engine.applyChoice('species', ['human'])
      const build = engine.finish()
      expect(build.systemId).toBe('test-system')
      expect(build.steps['species']).toEqual(['human'])
      expect(build.advancements).toEqual([])
    })

    it('Cancel returns null', () => {
      const engine = makeEngine()
      expect(engine.cancel()).toBeNull()
    })

  })

  describe('Group 2', () => {
    it('optional step can be skipped and engine can still finish', () => {
      const engine = makeEngine()
      // 'background' is required: false, 'species' is required: true
      engine.applyChoice('species', ['dwarf'])
      expect(engine.canFinish()).toBe(true)
      const build = engine.finish()
      expect(build.steps['background']).toBeUndefined()
    })

    it('applying choice to optional step records it in the build', () => {
      const engine = makeEngine()
      engine.applyChoice('species', ['troll'])
      engine.applyChoice('background', 'Runner')
      const build = engine.finish()
      expect(build.steps['background']).toBe('Runner')
    })
  })

  describe('Group 3', () => {
    it('finish throws when required steps not complete', () => {
      const engine = makeEngine()
      expect(() => engine.finish()).toThrow()
    })

    it('applyChoice throws for unknown step id', () => {
      const engine = makeEngine()
      expect(() => engine.applyChoice('nonexistent', 'value')).toThrow()
    })
  })

  describe('Group 4', () => {
    it('multiple steps applied sequentially produces correct build', () => {
      const forma = makeSimpleForma({
        steps: [
          { id: 'species', title: 'Species', kind: 'choices', from: 'species', max: 1, required: true },
          { id: 'name', title: 'Name', kind: 'free-text', required: true },
          { id: 'bio', title: 'Bio', kind: 'free-text', required: false },
        ],
      })
      const engine = new CreationEngine(forma, new StubExemplarQuery())
      engine.applyChoice('species', ['elf'])
      engine.applyChoice('name', 'Aria')
      expect(engine.canFinish()).toBe(true)
      const build = engine.finish()
      expect(build.steps['species']).toEqual(['elf'])
      expect(build.steps['name']).toBe('Aria')
    })

    it('cancel returns null regardless of engine state', () => {
      const engine = makeEngine()
      engine.applyChoice('species', ['human'])
      expect(engine.cancel()).toBeNull()
    })
  })
})