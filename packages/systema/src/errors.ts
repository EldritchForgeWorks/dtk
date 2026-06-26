export class SystemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SystemaError'
  }
}

export class ContextBuildError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContextBuildError'
  }
}
