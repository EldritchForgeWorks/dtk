import { describe, it, expect } from 'vitest'

// TODO: add imports for ExpressionParser

describe('ExpressionParser', () => {
  describe('Group 1', () => {
    it('`@initiator` scope resolution', () => {
      // TODO
    })

    it('`@steps` cross-step reference', () => {
      // TODO
    })

    it('unknown path → null', () => {
      // TODO
    })

    it('skipped step → null', () => {
      // TODO
    })

    it('arithmetic (+/-/*/÷) with precedence', () => {
      // TODO
    })

    it('division by zero → null + warning', () => {
      // TODO
    })

    it('delegation to `IExpressionDelegate` when present', () => {
      // TODO
    })

    it('delegation absent → null + warning', () => {
      // TODO
    })

    it('float pool coercion', () => {
      // TODO
    })

    it('null pool coercion', () => {
      // TODO
    })

  })

})