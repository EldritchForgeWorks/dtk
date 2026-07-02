// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

export class CodexEntryDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;
    return {
      slug: new f.StringField({ required: true, initial: '' }),
      description: new f.HTMLField({ required: false, initial: '' }),
      category: new f.StringField({ required: false, initial: '' }),
    };
  }
}
