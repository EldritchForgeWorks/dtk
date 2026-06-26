import { describe, it, expect, vi } from 'vitest'
import { StubSocketRelay } from '../../../src/adapters/in-memory/StubSocketRelay.js'

describe('StubSocketRelay', () => {
  describe('isGM', () => {
    it('returns false by default', () => {
      expect(new StubSocketRelay().isGM()).toBe(false)
    })

    it('returns true when constructed with true', () => {
      expect(new StubSocketRelay(true).isGM()).toBe(true)
    })
  })

  describe('send', () => {
    it('appends to sent array', () => {
      const relay = new StubSocketRelay()
      relay.send('msg.type', { data: 1 })
      expect(relay.sent).toHaveLength(1)
      expect(relay.sent[0]?.type).toBe('msg.type')
      expect(relay.sent[0]?.payload).toEqual({ data: 1 })
    })

    it('records multiple sent messages in order', () => {
      const relay = new StubSocketRelay()
      relay.send('a', 1)
      relay.send('b', 2)
      expect(relay.sent[0]?.type).toBe('a')
      expect(relay.sent[1]?.type).toBe('b')
    })
  })

  describe('onReceive / simulateReceive', () => {
    it('handler is called when simulateReceive fires matching type', () => {
      const relay = new StubSocketRelay()
      const handler = vi.fn()
      relay.onReceive('test.event', handler)
      relay.simulateReceive('test.event', { value: 42 })
      expect(handler).toHaveBeenCalledWith({ value: 42 })
    })

    it('handler is NOT called for different type', () => {
      const relay = new StubSocketRelay()
      const handler = vi.fn()
      relay.onReceive('test.event', handler)
      relay.simulateReceive('other.event', {})
      expect(handler).not.toHaveBeenCalled()
    })

    it('multiple handlers for same type all receive the message', () => {
      const relay = new StubSocketRelay()
      const h1 = vi.fn()
      const h2 = vi.fn()
      relay.onReceive('ev', h1)
      relay.onReceive('ev', h2)
      relay.simulateReceive('ev', 'hello')
      expect(h1).toHaveBeenCalledWith('hello')
      expect(h2).toHaveBeenCalledWith('hello')
    })

    it('unsubscribe fn removes the handler', () => {
      const relay = new StubSocketRelay()
      const handler = vi.fn()
      const unsub = relay.onReceive('ev', handler)
      unsub()
      relay.simulateReceive('ev', 'hello')
      expect(handler).not.toHaveBeenCalled()
    })

    it('does nothing when simulateReceive has no registered handlers', () => {
      const relay = new StubSocketRelay()
      expect(() => relay.simulateReceive('no.handlers', {})).not.toThrow()
    })
  })
})
