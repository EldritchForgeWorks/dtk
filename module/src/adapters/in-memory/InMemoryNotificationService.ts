import type { INotificationService } from '../../ports/INotificationService'

export class InMemoryNotificationService implements INotificationService {
  readonly infos: string[] = []
  readonly warns: string[] = []

  info(message: string): void {
    this.infos.push(message)
  }

  warn(message: string): void {
    this.warns.push(message)
  }

  clear(): void {
    this.infos.length = 0
    this.warns.length = 0
  }
}
