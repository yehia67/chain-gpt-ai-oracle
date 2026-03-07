export const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'agentAddress', type: 'address' },
      { internalType: 'string', name: 'agentURI', type: 'string' },
    ],
    name: 'registerAgent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'agentAddress', type: 'address' }],
    name: 'getAgent',
    outputs: [{ internalType: 'string', name: 'agentURI', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const VALIDATION_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'server', type: 'address' },
      { internalType: 'bytes32', name: 'dataHash', type: 'bytes32' },
      { internalType: 'string', name: 'validationType', type: 'string' },
    ],
    name: 'requestValidation',
    outputs: [{ internalType: 'uint256', name: 'requestId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'requestId', type: 'uint256' },
      { internalType: 'address', name: 'validator', type: 'address' },
      { internalType: 'string', name: 'proofURI', type: 'string' },
      { internalType: 'bool', name: 'verified', type: 'bool' },
    ],
    name: 'submitValidationResponse',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'requestId', type: 'uint256' }],
    name: 'getValidation',
    outputs: [
      { internalType: 'bool', name: 'verified', type: 'bool' },
      { internalType: 'string', name: 'proofURI', type: 'string' },
      { internalType: 'bool', name: 'responded', type: 'bool' },
      { internalType: 'address', name: 'validator', type: 'address' },
      { internalType: 'uint64', name: 'timestamp', type: 'uint64' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'client', type: 'address' },
      { internalType: 'address', name: 'server', type: 'address' },
      { internalType: 'string', name: 'feedbackURI', type: 'string' },
    ],
    name: 'submitFeedback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'server', type: 'address' }],
    name: 'getFeedback',
    outputs: [{ internalType: 'string[]', name: 'feedbackURIs', type: 'string[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
