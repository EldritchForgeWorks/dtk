// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

export class SequenceSheet extends foundry.applications.api.DocumentSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['dtk-alea', 'sequence-sheet'],
    window: { resizable: true },
    position: { width: 500, height: 'auto' as any },
  };

  static PARTS = {
    body: { template: 'modules/dtk-alea/templates/sequence-sheet.hbs' },
  };

  async _prepareContext(_options: any): Promise<any> {
    const item = this.document as any;
    return {
      name: item.name,
      systemId: item.system.systemId,
      steps: (item.system.steps ?? []).map((step: any, i: number) => ({
        index: i + 1,
        id: step.id ?? `step-${i}`,
        type: step.type,
        pool: step.pool,
        ritus: step.ritus ?? null,
      })),
      uuid: item.uuid,
    };
  }
}
