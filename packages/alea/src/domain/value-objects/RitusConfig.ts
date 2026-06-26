export interface RitusConfig {
  readonly id: string;
  readonly mechanic: string;
  readonly threshold: number;
  readonly tiers: Record<string, number>;
}
