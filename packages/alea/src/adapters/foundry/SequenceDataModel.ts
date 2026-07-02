// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
// TypeDataModel subclass for `dtk.sequence` items (Foundry V12+).
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

export class SequenceDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;
    return {
      id:       new f.StringField({ required: false, initial: '', blank: true }),
      systemId: new f.StringField({ required: true, initial: '' }),
      steps:    new f.ArrayField(new f.ObjectField()),
    };
  }
}
