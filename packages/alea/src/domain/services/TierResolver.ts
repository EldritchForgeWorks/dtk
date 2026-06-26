/**
 * Classifies net hits into a tier name by comparing against threshold breakpoints.
 * Tiers map: { tierName: minimumNetHits }, e.g. { critical: 4, hit: 1, glancing: 0 }.
 * Returns the name of the highest threshold ≤ netHits, or "miss" if none match.
 */
export function classify(netHits: number, tiers: Record<string, number>): string {
  const sorted = Object.entries(tiers).sort(([, a], [, b]) => b - a);
  for (const [name, threshold] of sorted) {
    if (netHits >= threshold) return name;
  }
  return 'miss';
}
