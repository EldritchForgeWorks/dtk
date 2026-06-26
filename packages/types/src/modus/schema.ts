import { z } from 'zod'

export const SettingConfigSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  hint: z.string().optional(),
  type: z.enum(['string', 'number', 'boolean', 'object']),
  default: z.unknown(),
  scope: z.enum(['world', 'client']),
  config: z.boolean(),
})

export const ActorTypeConfigSchema = z.object({
  label: z.string().min(1),
  dataModel: z.unknown(),
})

export const ItemTypeConfigSchema = z.object({
  label: z.string().min(1),
  dataModel: z.unknown(),
})

export const ModusSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  actors: z.record(z.string().min(1), ActorTypeConfigSchema).refine(
    (r) => Object.keys(r).length >= 1,
    'actors must have at least one entry'
  ),
  items: z.record(z.string().min(1), ItemTypeConfigSchema).optional(),
  ritus: z.string().optional(),
  codex: z.string().optional(),
  forma: z.string().optional(),
  settings: z.array(SettingConfigSchema).optional(),
})

export type SettingConfig = z.infer<typeof SettingConfigSchema>
export type ActorTypeConfig = z.infer<typeof ActorTypeConfigSchema>
export type ItemTypeConfig = z.infer<typeof ItemTypeConfigSchema>
export type Modus = z.infer<typeof ModusSchema>
