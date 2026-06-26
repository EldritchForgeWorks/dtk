import type { ITargetListener } from '../../ports/ITargetListener.js'

export class FoundryTargetListener implements ITargetListener {
  private hookId: number | null = null
  private selected: string[] = []

  waitForTokenTargets(min: number, max: number): Promise<readonly string[]> {
    return new Promise((resolve) => {
      this.hookId = Hooks.on('targetToken', (...args: unknown[]) => {
        const token = args[1] as FoundryTokenPlaceable
        const targeted = args[2] as boolean
        if (!targeted) {
          this.selected = this.selected.filter((id) => id !== token.id)
        } else {
          const id = token.id
          if (id && !this.selected.includes(id)) {
            if (this.selected.length >= max) {
              this.selected.shift()
            }
            this.selected.push(id)
          }
        }
        if (this.selected.length >= min && this.selected.length <= max) {
          this.cancelListening()
          resolve([...this.selected])
        }
      })
    })
  }

  cancelListening(): void {
    if (this.hookId !== null) {
      Hooks.off('targetToken', this.hookId)
      this.hookId = null
    }
  }
}
