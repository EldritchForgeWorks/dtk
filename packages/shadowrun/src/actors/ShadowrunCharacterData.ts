// Foundry adapter — requires live Foundry VTT environment.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

// SR 6e flat skill map — allows pool expressions like
// @initiator.system.skills.firearms + @initiator.system.agility
// to resolve through the ExpressionParser without array indexing.
export class ShadowrunCharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;
    const skill = () => new f.NumberField({ initial: 0, integer: true, min: 0, max: 12 });
    return {
      // Identity
      streetName:  new f.StringField({ initial: '' }),
      metatype:    new f.StringField({ initial: 'Human' }),
      archetype:   new f.StringField({ initial: '' }),

      // Physical attributes
      body:        new f.NumberField({ initial: 3, integer: true, min: 1, max: 12 }),
      agility:     new f.NumberField({ initial: 3, integer: true, min: 1, max: 12 }),
      reaction:    new f.NumberField({ initial: 3, integer: true, min: 1, max: 12 }),
      strength:    new f.NumberField({ initial: 3, integer: true, min: 1, max: 12 }),

      // Mental attributes
      willpower:   new f.NumberField({ initial: 3, integer: true, min: 1, max: 12 }),
      logic:       new f.NumberField({ initial: 3, integer: true, min: 1, max: 12 }),
      intuition:   new f.NumberField({ initial: 3, integer: true, min: 1, max: 12 }),
      charisma:    new f.NumberField({ initial: 3, integer: true, min: 1, max: 12 }),

      // Special attributes
      edge:          new f.NumberField({ initial: 3, integer: true, min: 1, max: 7 }),
      edgeCurrent:   new f.NumberField({ initial: 3, integer: true, min: 0, max: 7 }),
      essence:       new f.NumberField({ initial: 6.0, min: 0, max: 6 }),
      magic:         new f.NumberField({ initial: 0, integer: true, min: 0, max: 12 }),
      resonance:     new f.NumberField({ initial: 0, integer: true, min: 0, max: 12 }),

      // Combat ratings — AR from equipped weapon, DR from equipped armor
      ar: new f.NumberField({ initial: 0, integer: true, min: 0, max: 20 }),
      dr: new f.NumberField({ initial: 0, integer: true, min: 0, max: 20 }),

      // Condition monitors — current damage taken
      physicalDamage: new f.NumberField({ initial: 0, integer: true, min: 0, max: 20 }),
      stunDamage:     new f.NumberField({ initial: 0, integer: true, min: 0, max: 20 }),

      // SR 6e Active Skills (flat map so @initiator.system.skills.X resolves directly)
      skills: new f.SchemaField({
        athletics:     skill(),  // AGI — climbing, gymnastics, running, swimming
        astral:        skill(),  // INT — astral projection, astral combat
        biotech:       skill(),  // LOG — first aid, medicine, cybertechnology
        closeCombat:   skill(),  // AGI — unarmed combat, blades, clubs
        con:           skill(),  // CHA — deception, impersonation
        cracking:      skill(),  // LOG — hacking, cybercombat, electronic warfare
        electronics:   skill(),  // LOG — computer, hardware, software
        engineering:   skill(),  // LOG — demolitions, locksmith, mechanical
        exoticWeapons: skill(),  // AGI
        firearms:      skill(),  // AGI — pistols, SMGs, rifles, shotguns
        influence:     skill(),  // CHA — etiquette, leadership, negotiation
        outdoors:      skill(),  // INT — survival, navigation, tracking
        perception:    skill(),  // INT
        piloting:      skill(),  // REA — ground, aerospace, water vehicles
        sorcery:       skill(),  // MAG — spellcasting, ritual, counterspelling
        stealth:       skill(),  // AGI — disguise, palming, sneaking
        tasking:       skill(),  // RES — compiling, decompiling, registering
      }),

      // Free-form notes
      notes: new f.HTMLField({ initial: '' }),
    };
  }

  get physicalMonitor(): number {
    return 8 + Math.ceil((this as any).body / 2);
  }

  get stunMonitor(): number {
    return 8 + Math.ceil((this as any).willpower / 2);
  }

  get initiative(): string {
    const base = (this as any).reaction + (this as any).intuition;
    return `${base} + 1d6`;
  }

  get composure(): number {
    return (this as any).willpower + (this as any).charisma;
  }

  get judgeIntentions(): number {
    return (this as any).intuition + (this as any).charisma;
  }

  get liftCarry(): number {
    return (this as any).body + (this as any).strength;
  }
}
