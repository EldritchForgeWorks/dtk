import type { SystemaApi } from '@dtk/types'
import type { Modus } from '@dtk/types'

export function createSystemaApi(
  version: string,
  defineSystemFn: (modus: Modus) => void,
): SystemaApi & { _markReady(): void } {
  let ready = false

  return {
    get version() {
      return version
    },
    get isReady() {
      return ready
    },
    defineSystem(modus: unknown) {
      defineSystemFn(modus as Modus)
    },
    _markReady() {
      ready = true
    },
  }
}
