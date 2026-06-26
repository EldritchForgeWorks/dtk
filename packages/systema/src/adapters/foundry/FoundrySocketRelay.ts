import type { ISocketRelay, SocketHandler } from '../../ports/ISocketRelay.js'

interface SocketMessage<T> {
  type: string
  payload: T
}

export class FoundrySocketRelay implements ISocketRelay {
  private readonly socketName = 'module.dtk-systema'

  send<T>(type: string, payload: T): void {
    game.socket?.emit(this.socketName, { type, payload })
  }

  onReceive<T>(type: string, handler: SocketHandler<T>): () => void {
    const wrapper = (data: unknown) => {
      const msg = data as SocketMessage<T>
      if (msg.type === type) handler(msg.payload)
    }
    game.socket?.on(this.socketName, wrapper)
    return () => game.socket?.off(this.socketName, wrapper)
  }

  isGM(): boolean {
    return game.user?.isGM ?? false
  }
}
