export const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [{ internalType: 'string', name: 'agentURI', type: 'string' }],
    name: 'register',
    outputs: [{ internalType: 'uint256', name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'agentId', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'agentURI', type: 'string' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
    ],
    name: 'Registered',
    type: 'event',
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
      { internalType: 'uint256', name: 'agentId', type: 'uint256' },
      { internalType: 'int128', name: 'value', type: 'int128' },
      { internalType: 'uint8', name: 'valueDecimals', type: 'uint8' },
      { internalType: 'string', name: 'tag1', type: 'string' },
      { internalType: 'string', name: 'tag2', type: 'string' },
      { internalType: 'string', name: 'endpoint', type: 'string' },
      { internalType: 'string', name: 'feedbackURI', type: 'string' },
      { internalType: 'bytes32', name: 'feedbackHash', type: 'bytes32' },
    ],
    name: 'giveFeedback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'agentId', type: 'uint256' },
      { internalType: 'address', name: 'clientAddress', type: 'address' },
    ],
    name: 'getLastIndex',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'agentId', type: 'uint256' },
      { internalType: 'address', name: 'clientAddress', type: 'address' },
      { internalType: 'uint64', name: 'feedbackIndex', type: 'uint64' },
    ],
    name: 'readFeedback',
    outputs: [
      { internalType: 'int128', name: 'value', type: 'int128' },
      { internalType: 'uint8', name: 'valueDecimals', type: 'uint8' },
      { internalType: 'string', name: 'tag1', type: 'string' },
      { internalType: 'string', name: 'tag2', type: 'string' },
      { internalType: 'bool', name: 'isRevoked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
