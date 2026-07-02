// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

export class RitusSheet extends foundry.applications.api.DocumentSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['dtk-alea', 'ritus-sheet'],
    window: { resizable: true },
    position: { width: 400, height: 'auto' as any },
  };

  static PARTS = {
    body: { template: 'modules/dtk-alea/templates/ritus-sheet.hbs' },
  };

  async _prepareContext(_options: any): Promise<any> {
    const item = this.document as any;
    return {
      name: item.name,
      mechanic: item.system.mechanic,
      threshold: item.system.threshold,
      tiers: Object.entries(item.system.tiers ?? {}).map(([name, min]) => ({ name, min })),
      uuid: item.uuid,
    };
  }
}
