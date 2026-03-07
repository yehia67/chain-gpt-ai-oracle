import 'dotenv/config';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';

const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'agentURI', type: 'string' },
    ],
    name: 'register',
    outputs: [{ internalType: 'uint256', name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
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

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const identityRegistryAddress = process.env.A2A_IDENTITY_REGISTRY_ADDRESS;
  const agentUri = process.env.AGENT_URI;

  if (!rpcUrl || !privateKey || !identityRegistryAddress || !agentUri) {
    throw new Error(
      'RPC_URL, PRIVATE_KEY, A2A_IDENTITY_REGISTRY_ADDRESS, and AGENT_URI are required',
    );
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  const contract = new Contract(identityRegistryAddress, IDENTITY_REGISTRY_ABI, wallet);

  const tx = await contract.register(agentUri);
  const receipt = await tx.wait();

  let agentId: bigint | null = null;
  if (receipt) {
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        if (parsed?.name === 'Registered') {
          agentId = parsed.args.agentId as bigint;
          break;
        }
      } catch {
        // ignore non-matching logs
      }
    }
  }

  console.log(`Agent owner: ${wallet.address}`);
  if (agentId !== null) {
    console.log(`Agent ID: ${agentId.toString()}`);
  }
  console.log(`Tx hash: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
