import 'dotenv/config';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';

const IDENTITY_REGISTRY_ABI = [
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

  const tx = await contract.registerAgent(wallet.address, agentUri);
  await tx.wait();

  console.log(`Agent registered: ${wallet.address}`);
  console.log(`Tx hash: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
