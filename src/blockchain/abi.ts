export const MOCK_TRADE_EXECUTOR_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'validationRequestId', type: 'uint256' }],
    name: 'buy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'validationRequestId', type: 'uint256' }],
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
      {
        indexed: true,
        internalType: 'uint256',
        name: 'validationRequestId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'executor',
        type: 'address',
      },
    ],
    name: 'TradeExecuted',
    type: 'event',
  },
] as const;
