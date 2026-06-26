import type { IModuleInstaller } from '../../ports/IModuleInstaller'

export class SpyModuleInstaller implements IModuleInstaller {
  readonly calls: string[] = []

  install(manifestUrl: string): void {
    this.calls.push(manifestUrl)
  }
}
