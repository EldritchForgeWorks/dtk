export interface SystemaApi {
  defineSystem(modus: unknown): void
  readonly version: string
  readonly isReady: boolean
}
