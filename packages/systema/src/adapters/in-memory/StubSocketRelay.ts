import type { ISocketRelay, SocketHandler } from '../../ports/ISocketRelay.js'

export interface SentMessage {
  type: string
  payload: unknown
}

export class StubSocketRelay implements ISocketRelay {
  readonly sent: SentMessage[] = []
  private readonly handlers = new Map<string, Set<SocketHandler>>()
  private readonly gmFlag: boolean

  constructor(isGm: boolean = false) {
    this.gmFlag = isGm
  }

  send<T>(type: string, payload: T): void {
    this.sent.push({ type, payload })
  }

  onReceive<T>(type: string, handler: SocketHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    const set = this.handlers.get(type)!
    set.add(handler as SocketHandler)
    return () => {
      set.delete(handler as SocketHandler)
    }
  }

  isGM(): boolean {
    return this.gmFlag
  }

  simulateReceive<T>(type: string, payload: T): void {
    const set = this.handlers.get(type)
    if (!set) return
    for (const handler of set) {
      handler(payload)
    }
  }
}
