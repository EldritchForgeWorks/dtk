export type SocketHandler<T = unknown> = (payload: T) => void

export interface ISocketRelay {
  send<T>(type: string, payload: T): void
  onReceive<T>(type: string, handler: SocketHandler<T>): () => void
  isGM(): boolean
}
