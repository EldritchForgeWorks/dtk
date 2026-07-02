export interface RitusConfig {
  readonly id: string;
  readonly mechanic: string;
  readonly sides: number;
  readonly explodes: boolean;
  readonly keepMode?: 'highest' | 'lowest';
  readonly threshold: number;
  readonly tiers: Record<string, number>;
}
