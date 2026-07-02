// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;
declare const TextEditor: any;

export class CodexEntrySheet extends foundry.applications.api.DocumentSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ['dtk-lex', 'codex-entry-sheet'],
    window: { resizable: true },
    position: { width: 450, height: 'auto' as any },
  };

  static PARTS = {
    body: { template: 'modules/dtk-lex/templates/codex-entry-sheet.hbs' },
  };

  async _prepareContext(_options: any): Promise<any> {
    const item = this.document as any;
    const enrichedDescription = item.system.description
      ? await TextEditor.enrichHTML(item.system.description)
      : '';
    return {
      name: item.name,
      slug: item.system.slug,
      description: enrichedDescription,
      category: item.system.category || '',
      uuid: item.uuid,
    };
  }
}
