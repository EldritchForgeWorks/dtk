import type { ITemplateManager, TemplateSpec } from '../../ports/ITemplateManager.js'

export class FoundryTemplateManager implements ITemplateManager {
  async create(spec: TemplateSpec): Promise<string> {
    const docs = await MeasuredTemplate.create([
      {
        t: spec.type,
        distance: spec.distance,
        x: spec.x ?? 0,
        y: spec.y ?? 0,
        user: game.user?.id,
      },
    ])
    const doc = (docs as FoundryMeasuredTemplateDocument[])[0]
    return doc?.id ?? ''
  }

  async delete(templateId: string): Promise<void> {
    const template = canvas.templates?.get(templateId)
    await template?.document.delete()
  }

  async waitForPlacement(): Promise<{ x: number; y: number }> {
    return new Promise((resolve) => {
      const hook = Hooks.on('createMeasuredTemplate', (...args: unknown[]) => {
        const doc = args[0] as FoundryMeasuredTemplateDocument
        Hooks.off('createMeasuredTemplate', hook)
        resolve({ x: doc.x, y: doc.y })
      })
    })
  }
}
