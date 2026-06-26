export interface ActorSnapshot {
  id: string;
  name: string;
  system: Record<string, unknown>;
}

export interface ItemSnapshot {
  id: string;
  name: string;
  system: Record<string, unknown>;
}

export interface CombatSnapshot {
  round: number;
  turn: number;
  combatantId: string;
}

export interface EvaluationContext {
  initiator: ActorSnapshot;
  target: ActorSnapshot | null;
  item: ItemSnapshot | null;
  combat: CombatSnapshot | null;
  stepOutputs: Map<string, unknown>;
}

export interface IExpressionDelegate {
  evaluate(expression: string, context: EvaluationContext): unknown | null;
}
