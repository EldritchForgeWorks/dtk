import { ModusSchema } from '@dtk/types'
import type { Modus, SettingConfig } from '@dtk/types'
import { SystemaError } from '../../errors.js'

export interface ActorDeclaration {
  type: string
  label: string
  dataModel: unknown
}

export interface ItemDeclaration {
  type: string
  label: string
  dataModel: unknown
}

export interface RegistrationDescriptor {
  systemId: string
  actors: readonly ActorDeclaration[]
  items: readonly ItemDeclaration[]
  settings: readonly SettingConfig[]
  hooks: readonly string[]
}

export class SystemRegistrar {
  static validate(modus: unknown): modus is Modus {
    return ModusSchema.safeParse(modus).success
  }

  static build(modus: unknown): RegistrationDescriptor {
    const result = ModusSchema.safeParse(modus)
    if (!result.success) {
      throw new SystemaError(
        `Invalid Modus: ${result.error.errors.map((e) => e.message).join('; ')}`,
      )
    }

    const valid = result.data

    const actors: ActorDeclaration[] = Object.entries(valid.actors).map(
      ([type, config]) => ({
        type,
        label: config.label,
        dataModel: config.dataModel,
      }),
    )

    const items: ItemDeclaration[] = valid.items
      ? Object.entries(valid.items).map(([type, config]) => ({
          type,
          label: config.label,
          dataModel: config.dataModel,
        }))
      : []

    return {
      systemId: valid.id,
      actors,
      items,
      settings: valid.settings ?? [],
      hooks: [],
    }
  }
}
