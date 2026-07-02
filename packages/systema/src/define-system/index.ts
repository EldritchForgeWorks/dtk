import { SystemRegistrar } from '../domain/services/SystemRegistrar.js'
import { FoundrySystemRegistrar } from './foundry-registrar.js'
import { SystemaError } from '../errors.js'
import type { Modus } from '@eldritchforgeworks/dtk-types'

let initWindowOpen = false

export function setInitWindowOpen(v: boolean): void {
  initWindowOpen = v
}

export function defineSystem(modus: Modus): void {
  if (!initWindowOpen) {
    throw new SystemaError(
      "defineSystem() must be called from your system's Hooks.on('init') handler. The Foundry init window is closed.",
    )
  }
  const descriptor = SystemRegistrar.build(modus)
  FoundrySystemRegistrar.applyDescriptor(descriptor)
}
