declare const Handlebars: { registerPartial(name: string, template: string): void };

import sheetTpl   from './partials/sheet.hbs?raw';
import cardTpl    from './partials/card.hbs?raw';
import dialogTpl  from './partials/dialog.hbs?raw';
import fieldTpl   from './partials/field.hbs?raw';
import sectionTpl from './partials/section.hbs?raw';

export function registerPartials(): void {
  Handlebars.registerPartial('dtk-sheet',   sheetTpl);
  Handlebars.registerPartial('dtk-card',    cardTpl);
  Handlebars.registerPartial('dtk-dialog',  dialogTpl);
  Handlebars.registerPartial('dtk-field',   fieldTpl);
  Handlebars.registerPartial('dtk-section', sectionTpl);
}
