declare const foundry: any;

export class FasciaApp extends (foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
)) {
  override _onRender(context: object, options: object): void {
    super._onRender(context, options);
    this.element?.classList.add('dtk-app');
  }
}
