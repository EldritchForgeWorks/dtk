import { describe, it, expect } from 'vitest'
import { StubTargetListener } from '../../../src/adapters/in-memory/StubTargetListener.js'

describe('StubTargetListener', () => {
  describe('setTokenIds / waitForTokenTargets', () => {
    it('resolves with configured token ids', async () => {
      const stub = new StubTargetListener().setTokenIds(['tok-1', 'tok-2'])
      const result = await stub.waitForTokenTargets(1, 2)
      expect(result).toEqual(['tok-1', 'tok-2'])
    })

    it('resolves with empty array when no ids configured', async () => {
      const stub = new StubTargetListener()
      const result = await stub.waitForTokenTargets(0, 5)
      expect(result).toEqual([])
    })

    it('setTokenIds supports chaining', () => {
      const stub = new StubTargetListener()
      expect(stub.setTokenIds(['tok-1'])).toBe(stub)
    })
  })

  describe('cancelListening', () => {
    it('sets cancelCalled to true', () => {
      const stub = new StubTargetListener()
      expect(stub.cancelCalled).toBe(false)
      stub.cancelListening()
      expect(stub.cancelCalled).toBe(true)
    })

    it('can be called multiple times without error', () => {
      const stub = new StubTargetListener()
      stub.cancelListening()
      stub.cancelListening()
      expect(stub.cancelCalled).toBe(true)
    })
  })
})
