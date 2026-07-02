import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Handlebars as a global before importing registerPartials
const registerPartialMock = vi.fn();
(globalThis as any).Handlebars = { registerPartial: registerPartialMock };

// Dynamic import after mock is set
const { registerPartials } = await import('../src/registerPartials.js');

const EXPECTED_NAMES = ['dtk-sheet', 'dtk-card', 'dtk-dialog', 'dtk-field', 'dtk-section'];

describe('registerPartials', () => {
  beforeEach(() => {
    registerPartialMock.mockClear();
  });

  describe('Scenario', () => {
    it('calls Handlebars.registerPartial exactly 5 times', () => {
      registerPartials();
      expect(registerPartialMock).toHaveBeenCalledTimes(5);
    });

    it('registers all expected partial names', () => {
      registerPartials();
      const registeredNames = registerPartialMock.mock.calls.map(([name]) => name);
      for (const name of EXPECTED_NAMES) {
        expect(registeredNames).toContain(name);
      }
    });

    it('passes non-empty template strings for all partials', () => {
      registerPartials();
      for (const [, template] of registerPartialMock.mock.calls) {
        expect(typeof template).toBe('string');
        expect(template.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('Boundary', () => {
    it('can be called multiple times without error', () => {
      expect(() => {
        registerPartials();
        registerPartials();
      }).not.toThrow();
    });
  });

  describe('Failure', () => {
    it('propagates Handlebars.registerPartial errors', () => {
      registerPartialMock.mockImplementationOnce(() => { throw new Error('Handlebars error'); });
      expect(() => registerPartials()).toThrow('Handlebars error');
    });
  });

  describe('Combinatorial', () => {
    it('each partial name maps to a unique non-empty template', () => {
      registerPartials();
      const calls = registerPartialMock.mock.calls as [string, string][];
      const nameToTemplate = new Map(calls);
      expect(nameToTemplate.size).toBe(5);
      const templates = [...nameToTemplate.values()];
      const unique = new Set(templates);
      expect(unique.size).toBe(5);
    });
  });
});
