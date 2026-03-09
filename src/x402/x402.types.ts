export type X402ExecutionMode = 'local' | 'facilitator';

export interface X402Condition {
  version: 'x402-execution-v1';
  taskId: string;
  action: 'BUY' | 'SELL';
  method: 'buy' | 'sell';
  contractAddress: string;
  chainId: number;
  validationRequestId: string;
  dataHash: string;
  nonce: string;
  expiresAt: string;
}

export interface SignedX402Condition {
  condition: X402Condition;
  conditionHash: string;
  signature: string;
  signer: string;
}

export interface X402ExecutionReceipt {
  txHash: string;
  mode: X402ExecutionMode;
  conditionHash: string;
  conditionSignature: string;
  settlementRef: string;
}
