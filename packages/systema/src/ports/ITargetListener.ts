export interface ITargetListener {
  waitForTokenTargets(min: number, max: number): Promise<readonly string[]>
  cancelListening(): void
}
