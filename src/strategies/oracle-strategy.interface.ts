export type OracleDecision = {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number; // 0 → 1 range enforced by strategy implementations
};

export type OracleAction =
  | { type: 'BUY' }
  | { type: 'SELL' }
  | { type: 'NO_ACTION' };

export interface AIOracleStrategy<TInput> {
  buildPrompt(input: TInput): string;
  parseResponse(raw: string): OracleDecision;
  mapToTransaction(decision: OracleDecision): OracleAction;
}
