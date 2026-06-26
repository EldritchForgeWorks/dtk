import { describe, it, expect } from 'vitest'
import { PendingDecision } from '../../../../src/domain/entities/PendingDecision.js'
import { makePendingDecisionPayload } from '../../helpers/fixtures.js'

describe('PendingDecision', () => {
  describe('constructor', () => {
    it('stores all payload fields', () => {
      const payload = makePendingDecisionPayload()
      const decision = new PendingDecision(payload)

      expect(decision.sequenceId).toBe('seq-1')
      expect(decision.stepId).toBe('step-1')
      expect(decision.actorId).toBe('actor-1')
      expect(decision.pendingAt).toBe(1000)
      expect(decision.timeout).toBe(30000)
      expect(decision.defaultChoice).toBe('a')
      expect(decision.choices).toEqual([
        { id: 'a', label: 'Option A' },
        { id: 'b', label: 'Option B' },
      ])
    })

    it('stores null timeout when not set', () => {
      const payload = makePendingDecisionPayload({ timeout: null })
      const decision = new PendingDecision(payload)
      expect(decision.timeout).toBeNull()
    })

    it('stores null defaultChoice when not set', () => {
      const payload = makePendingDecisionPayload({ defaultChoice: null })
      const decision = new PendingDecision(payload)
      expect(decision.defaultChoice).toBeNull()
    })

    it('stores empty choices array', () => {
      const payload = makePendingDecisionPayload({ choices: [] })
      const decision = new PendingDecision(payload)
      expect(decision.choices).toHaveLength(0)
    })
  })

  describe('isExpired', () => {
    it('returns false when timeout is null (never expires)', () => {
      const decision = new PendingDecision(makePendingDecisionPayload({ timeout: null, pendingAt: 1000 }))
      expect(decision.isExpired(999999)).toBe(false)
    })

    it('returns true when pendingAt + timeout <= now', () => {
      const decision = new PendingDecision(makePendingDecisionPayload({ pendingAt: 1000, timeout: 30000 }))
      expect(decision.isExpired(31000)).toBe(true)
    })

    it('returns true when exactly at expiry boundary', () => {
      const decision = new PendingDecision(makePendingDecisionPayload({ pendingAt: 1000, timeout: 30000 }))
      expect(decision.isExpired(31000)).toBe(true)
    })

    it('returns false when timeout has not yet elapsed', () => {
      const decision = new PendingDecision(makePendingDecisionPayload({ pendingAt: 1000, timeout: 30000 }))
      expect(decision.isExpired(25000)).toBe(false)
    })

    it('returns false when now equals pendingAt (just created)', () => {
      const decision = new PendingDecision(makePendingDecisionPayload({ pendingAt: 5000, timeout: 10000 }))
      expect(decision.isExpired(5000)).toBe(false)
    })
  })

  describe('resolveDefault', () => {
    it('returns defaultChoice when set', () => {
      const decision = new PendingDecision(makePendingDecisionPayload({ defaultChoice: 'a' }))
      expect(decision.resolveDefault()).toBe('a')
    })

    it('returns null when defaultChoice is null', () => {
      const decision = new PendingDecision(makePendingDecisionPayload({ defaultChoice: null }))
      expect(decision.resolveDefault()).toBeNull()
    })
  })

  describe('toPayload', () => {
    it('round-trips to identical payload', () => {
      const payload = makePendingDecisionPayload()
      const decision = new PendingDecision(payload)
      expect(decision.toPayload()).toEqual(payload)
    })

    it('preserves null fields', () => {
      const payload = makePendingDecisionPayload({ timeout: null, defaultChoice: null })
      const decision = new PendingDecision(payload)
      const out = decision.toPayload()
      expect(out.timeout).toBeNull()
      expect(out.defaultChoice).toBeNull()
    })
  })
})
