import { describe, it, expect } from 'vitest'

// TODO: add imports for SequenceExecutor

describe('SequenceExecutor', () => {
  describe('Group 1', () => {
    it('all steps execute in order', () => {
      // TODO
    })

    it('step with false condition skipped', () => {
      // TODO
    })

    it('skipped step does not block next', () => {
      // TODO
    })

    it('await step calls `ICombatStateStore.save()` + `IHookEmitter.emit()` + stops', () => {
      // TODO
    })

    it('resume continues after await with choice', () => {
      // TODO
    })

    it('resume with null choice', () => {
      // TODO
    })

    it('on-tier damage formula evaluated', () => {
      // TODO
    })

    it('miss tier with no on_tier is no-op', () => {
      // TODO
    })

    it('`dtk-alea.complete` fires after last step', () => {
      // TODO
    })

    it('complete does not fire during suspension', () => {
      // TODO
    })

  })

})