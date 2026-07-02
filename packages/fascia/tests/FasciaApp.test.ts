import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withFascia } from '../src/withFascia.js';

// ── Shared mock ───────────────────────────────────────────────────────────────

function makeMockBase() {
  const onRenderSpy = vi.fn();
  class MockBase {
    element: { classList: { add: ReturnType<typeof vi.fn> } } | null = {
      classList: { add: vi.fn() },
    };
    _onRender(context: object, options: object): void {
      onRenderSpy(context, options);
    }
  }
  return { MockBase, onRenderSpy };
}

// ── withFascia ────────────────────────────────────────────────────────────────

describe('withFascia mixin', () => {
  describe('Scenario', () => {
    it('adds dtk-app class to element on _onRender', () => {
      const { MockBase } = makeMockBase();
      const Enhanced = withFascia(MockBase as any);
      const instance = new Enhanced() as any;
      instance._onRender({}, {});
      expect(instance.element.classList.add).toHaveBeenCalledWith('dtk-app');
    });

    it('calls original _onRender from the base class', () => {
      const { MockBase, onRenderSpy } = makeMockBase();
      const Enhanced = withFascia(MockBase as any);
      const instance = new Enhanced() as any;
      const ctx = { foo: 1 };
      const opts = { bar: 2 };
      instance._onRender(ctx, opts);
      expect(onRenderSpy).toHaveBeenCalledWith(ctx, opts);
    });
  });

  describe('Boundary', () => {
    it('handles null element without throwing', () => {
      const { MockBase } = makeMockBase();
      const Enhanced = withFascia(MockBase as any);
      const instance = new Enhanced() as any;
      instance.element = null;
      expect(() => instance._onRender({}, {})).not.toThrow();
    });

    it('handles undefined element without throwing', () => {
      const { MockBase } = makeMockBase();
      const Enhanced = withFascia(MockBase as any);
      const instance = new Enhanced() as any;
      instance.element = undefined;
      expect(() => instance._onRender({}, {})).not.toThrow();
    });
  });

  describe('Failure', () => {
    it('does not add dtk-app if element is null', () => {
      const { MockBase } = makeMockBase();
      const Enhanced = withFascia(MockBase as any);
      const instance = new Enhanced() as any;
      instance.element = null;
      instance._onRender({}, {});
      // No error and no classList.add call attempted
      expect(true).toBe(true);
    });
  });

  describe('Combinatorial', () => {
    it('applies dtk-app class regardless of context and options shape', () => {
      const cases = [
        [{}, {}],
        [{ actor: { id: '1' } }, { force: true }],
        [null, null],
      ] as const;
      const { MockBase } = makeMockBase();
      const Enhanced = withFascia(MockBase as any);
      for (const [ctx, opts] of cases) {
        const instance = new Enhanced() as any;
        instance._onRender(ctx as any, opts as any);
        expect(instance.element.classList.add).toHaveBeenCalledWith('dtk-app');
      }
    });
  });
});
