import { describe, it, expect } from 'vitest'
import { StubActionExecutor } from '../../../src/adapters/in-memory/StubActionExecutor.js'
import { makeRollContext } from '../helpers/fixtures.js'

describe('StubActionExecutor', () => {
  describe('isAvailable', () => {
    it('returns true by default', () => {
      expect(new StubActionExecutor().isAvailable()).toBe(true)
    })

    it('returns false when set to unavailable', () => {
      expect(new StubActionExecutor().setAvailable(false).isAvailable()).toBe(false)
    })

    it('supports chaining setAvailable', () => {
      const ex = new StubActionExecutor()
      expect(ex.setAvailable(true)).toBe(ex)
    })
  })

  describe('execute', () => {
    it('records execute calls', async () => {
      const ex = new StubActionExecutor()
      const ctx = makeRollContext()
      await ex.execute(ctx)
      expect(ex.executeCalls).toHaveLength(1)
      expect(ex.executeCalls[0]?.context).toBe(ctx)
    })

    it('records multiple execute calls in order', async () => {
      const ex = new StubActionExecutor()
      const ctx1 = makeRollContext({ actionId: 'a1' })
      const ctx2 = makeRollContext({ actionId: 'a2' })
      await ex.execute(ctx1)
      await ex.execute(ctx2)
      expect(ex.executeCalls[0]?.context.actionId).toBe('a1')
      expect(ex.executeCalls[1]?.context.actionId).toBe('a2')
    })
  })

  describe('resume', () => {
    it('records resume calls', async () => {
      const ex = new StubActionExecutor()
      await ex.resume('seq-1', 'choice-a')
      expect(ex.resumeCalls).toHaveLength(1)
      expect(ex.resumeCalls[0]?.sequenceId).toBe('seq-1')
      expect(ex.resumeCalls[0]?.choice).toBe('choice-a')
    })

    it('records multiple resume calls in order', async () => {
      const ex = new StubActionExecutor()
      await ex.resume('s1', 'c1')
      await ex.resume('s2', 'c2')
      expect(ex.resumeCalls[0]?.sequenceId).toBe('s1')
      expect(ex.resumeCalls[1]?.sequenceId).toBe('s2')
    })
  })
})
