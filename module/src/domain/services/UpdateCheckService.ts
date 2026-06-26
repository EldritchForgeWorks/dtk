import type { RegistryDocument } from '../value-objects/RegistryDocument'
import { ModuleVersion } from '../value-objects/ModuleVersion'

export function checkForUpdates(
  registry: RegistryDocument,
  installed: Map<string, string>,
): string[] {
  const outdated: string[] = []
  for (const entry of registry.modules) {
    const installedRaw = installed.get(entry.id)
    if (!installedRaw) continue
    try {
      const installedVer = ModuleVersion.parse(installedRaw)
      const latestVer = ModuleVersion.parse(entry.latestVersion)
      if (latestVer.isNewerThan(installedVer)) {
        outdated.push(entry.id)
      }
    } catch {
      // Malformed version string — skip rather than crash
    }
  }
  return outdated
}
