export class ModuleVersion {
  private readonly major: number
  private readonly minor: number
  private readonly patch: number

  private constructor(raw: string) {
    const parts = raw.split('.')
    if (parts.length !== 3) throw new Error(`Invalid version: "${raw}"`)
    const [major, minor, patch] = parts.map(Number)
    if ([major, minor, patch].some(n => !Number.isInteger(n) || n < 0 || Number.isNaN(n))) {
      throw new Error(`Invalid version: "${raw}"`)
    }
    this.major = major
    this.minor = minor
    this.patch = patch
  }

  static parse(version: string): ModuleVersion {
    return new ModuleVersion(version.trim())
  }

  isNewerThan(other: ModuleVersion): boolean {
    if (this.major !== other.major) return this.major > other.major
    if (this.minor !== other.minor) return this.minor > other.minor
    return this.patch > other.patch
  }

  equals(other: ModuleVersion): boolean {
    return (
      this.major === other.major &&
      this.minor === other.minor &&
      this.patch === other.patch
    )
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`
  }
}
