import type { CodexEntry } from '../../src/domain/CodexEntry.js';

export function makeCodexEntry(overrides?: Partial<CodexEntry>): CodexEntry {
  return { slug: 'agility', displayName: 'Agility', ...overrides };
}

export function makeSr5eCodex(): CodexEntry[] {
  return [
    { slug: 'agility',   displayName: 'Agility' },
    { slug: 'body',      displayName: 'Body' },
    { slug: 'willpower', displayName: 'Willpower' },
    { slug: 'strength',  displayName: 'Strength' },
    { slug: 'logic',     displayName: 'Logic' },
    { slug: 'intuition', displayName: 'Intuition' },
    { slug: 'charisma',  displayName: 'Charisma' },
    { slug: 'edge',      displayName: 'Edge' },
  ];
}

export function makeConditionEntry(slug: string, condition: string): CodexEntry {
  return { slug, displayName: slug, condition };
}
