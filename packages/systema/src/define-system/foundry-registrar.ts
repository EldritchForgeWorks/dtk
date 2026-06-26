import type { RegistrationDescriptor } from '../domain/services/SystemRegistrar.js'

export class FoundrySystemRegistrar {
  static applyDescriptor(descriptor: RegistrationDescriptor): void {
    for (const actor of descriptor.actors) {
      CONFIG.Actor.dataModels[actor.type] = actor.dataModel
    }

    for (const item of descriptor.items) {
      CONFIG.Item.dataModels[item.type] = item.dataModel
    }

    for (const setting of descriptor.settings) {
      const typeMap: Record<string, string> = {
        string: 'String',
        number: 'Number',
        boolean: 'Boolean',
        object: 'Object',
      }
      game.settings?.register(descriptor.systemId, setting.key, {
        name: setting.name,
        hint: setting.hint,
        type: typeMap[setting.type] ?? 'String',
        default: setting.default,
        scope: setting.scope,
        config: setting.config,
      })
    }

    for (const hookName of descriptor.hooks) {
      Hooks.on(hookName, () => {
        // Hook registration placeholder
      })
    }
  }
}
