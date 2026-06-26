export interface TemplateSpec {
  type: 'circle' | 'cone' | 'ray' | 'rect'
  distance: number
  x?: number
  y?: number
}

export interface ITemplateManager {
  create(spec: TemplateSpec): Promise<string>
  delete(templateId: string): Promise<void>
  waitForPlacement(): Promise<{ x: number; y: number }>
}
