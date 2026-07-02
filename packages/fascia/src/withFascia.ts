type Constructor<T = object> = new (...args: any[]) => T;

interface ApplicationV2Like {
  element?: { classList: { add(cls: string): void } } | null;
  _onRender(context: object, options: object): void;
}

export function withFascia<TBase extends Constructor<ApplicationV2Like>>(Base: TBase) {
  return class FasciaEnhanced extends Base {
    override _onRender(context: object, options: object): void {
      super._onRender(context, options);
      this.element?.classList.add('dtk-app');
    }
  };
}
