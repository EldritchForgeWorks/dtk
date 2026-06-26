export class DtkModuleEntry {
  private _ready = false

  constructor(
    readonly id: string,
    readonly version: string,
    readonly api: unknown,
  ) {
    if (!id.trim()) throw new Error('DtkModuleEntry: id must not be empty')
  }

  get ready(): boolean {
    return this._ready
  }

  markReady(): void {
    this._ready = true
  }
}
