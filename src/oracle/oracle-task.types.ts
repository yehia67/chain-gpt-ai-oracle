export type OracleTaskLifecycleStatus =
  | 'PENDING_VALIDATION'
  | 'PROCESSING'
  | 'EXECUTED'
  | 'REJECTED'
  | 'FAILED'
  | 'COMPLETED_NO_ACTION';

export interface CreateOracleTaskResponse {
  taskId: string;
  status: OracleTaskLifecycleStatus;
  action: 'BUY' | 'SELL' | 'NO_ACTION';
  validationRequestId: string | null;
}

export interface OracleTaskDetailsResponse {
  taskId: string;
  status: OracleTaskLifecycleStatus;
  action: 'BUY' | 'SELL' | 'NO_ACTION';
  sentiment: string | null;
  confidence: number | null;
  rawResponse: string | null;
  dataHash: string | null;
  validationRequestId: string | null;
  validationStatus: string;
  executionStatus: string;
  txHash: string | null;
  validationProofUri: string | null;
  feedbackUri: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
