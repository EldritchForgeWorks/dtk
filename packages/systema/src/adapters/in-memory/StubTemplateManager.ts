import type { ITemplateManager, TemplateSpec } from '../../ports/ITemplateManager.js'

export class StubTemplateManager implements ITemplateManager {
  private nextId = 'template-1'
  private readonly created: { id: string; spec: TemplateSpec }[] = []
  private readonly deleted: string[] = []
  private placement: { x: number; y: number } = { x: 0, y: 0 }

  setNextId(id: string): this {
    this.nextId = id
    return this
  }

  setPlacement(x: number, y: number): this {
    this.placement = { x, y }
    return this
  }

  async create(spec: TemplateSpec): Promise<string> {
    const id = this.nextId
    this.created.push({ id, spec })
    return id
  }

  async delete(templateId: string): Promise<void> {
    this.deleted.push(templateId)
  }

  async waitForPlacement(): Promise<{ x: number; y: number }> {
    return { ...this.placement }
  }

  wasCreated(templateId: string): boolean {
    return this.created.some((c) => c.id === templateId)
  }

  wasDeleted(templateId: string): boolean {
    return this.deleted.includes(templateId)
  }

  getCreated(): ReadonlyArray<{ id: string; spec: TemplateSpec }> {
    return this.created
  }
}
