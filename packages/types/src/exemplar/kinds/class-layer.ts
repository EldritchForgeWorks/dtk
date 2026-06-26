import { z } from 'zod'
import { GrantSchema } from '../grant.js'

// ─── Base envelope (shared) ───────────────────────────────────────────────────

export const ExemplarBaseSchema = z.object({
  id: z.string().min(1, 'id must be a non-empty string'),
  version: z.string().regex(
    /^\d+\.\d+\.\d+/,
    'version must be a semver string (e.g. "0.1.0")'
  ),
  kind: z.string(),
  name: z.string().min(1, 'name must be a non-empty string'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// ─── Class-layer kinds ────────────────────────────────────────────────────────

export const SpeciesExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('species'),
  grants: z.array(GrantSchema),
})

export const ArchetypeExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('archetype'),
  grants: z.array(GrantSchema),
})

export const DisciplineExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('discipline'),
  parent: z.string().min(1),
  grants: z.array(GrantSchema),
})

export const VocationExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('vocation'),
  parent: z.string().min(1),
  grants: z.array(GrantSchema),
})

export const ItemExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('item'),
  itemType: z.string().min(1),
  grants: z.array(GrantSchema),
})

export const BackgroundExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('background'),
  grants: z.array(GrantSchema),
})

export const OriginExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('origin'),
  grants: z.array(GrantSchema),
})

export const FeatureExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('feature'),
  grants: z.array(GrantSchema),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExemplarBase = z.infer<typeof ExemplarBaseSchema>
export type SpeciesExemplar = z.infer<typeof SpeciesExemplarSchema>
export type ArchetypeExemplar = z.infer<typeof ArchetypeExemplarSchema>
export type DisciplineExemplar = z.infer<typeof DisciplineExemplarSchema>
export type VocationExemplar = z.infer<typeof VocationExemplarSchema>
export type ItemExemplar = z.infer<typeof ItemExemplarSchema>
export type BackgroundExemplar = z.infer<typeof BackgroundExemplarSchema>
export type OriginExemplar = z.infer<typeof OriginExemplarSchema>
export type FeatureExemplar = z.infer<typeof FeatureExemplarSchema>
