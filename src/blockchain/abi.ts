export const MOCK_TRADE_EXECUTOR_ABI = [
  {
    inputs: [],
    name: 'buy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'sell',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'action',
        type: 'string',
      },
    ],
    name: 'TradeExecuted',
    type: 'event',
  },
] as const;
