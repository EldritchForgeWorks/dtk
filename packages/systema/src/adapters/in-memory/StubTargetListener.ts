import type { ITargetListener } from '../../ports/ITargetListener.js'

export class StubTargetListener implements ITargetListener {
  private tokenIds: string[] = []
  cancelCalled = false

  setTokenIds(ids: string[]): this {
    this.tokenIds = ids
    return this
  }

  async waitForTokenTargets(_min: number, _max: number): Promise<readonly string[]> {
    return [...this.tokenIds]
  }

  cancelListening(): void {
    this.cancelCalled = true
  }
}
