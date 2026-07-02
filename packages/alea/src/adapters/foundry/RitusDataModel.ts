// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
// TypeDataModel subclass for `dtk.ritus` items (Foundry V12+).
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

export class RitusDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;
    return {
      id:        new f.StringField({ required: false, initial: '', blank: true }),
      mechanic:  new f.StringField({ required: true, initial: 'pool-count' }),
      sides:     new f.NumberField({ required: true, initial: 6, integer: true, min: 2 }),
      explodes:  new f.BooleanField({ required: true, initial: false }),
      keepMode:  new f.StringField({ required: false, initial: '', blank: true }),
      threshold: new f.NumberField({ required: true, initial: 5, integer: true, min: 1 }),
      tiers:     new f.ObjectField({ required: true, initial: {} }),
    };
  }
}
