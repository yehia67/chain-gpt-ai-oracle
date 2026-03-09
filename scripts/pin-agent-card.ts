import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Wallet } from 'ethers';

interface PinataPinResponse {
  IpfsHash: string;
}

async function main() {
  const pinataJwt = process.env.PINATA_JWT;
  const privateKey = process.env.PRIVATE_KEY;

  if (!pinataJwt) {
    throw new Error('PINATA_JWT is required');
  }
  if (!privateKey) {
    throw new Error('PRIVATE_KEY is required');
  }

  const wallet = new Wallet(privateKey);
  const chainId = Number(process.env.CHAIN_ID ?? 11155111);
  const identityRegistryAddress =
    process.env.A2A_IDENTITY_REGISTRY_ADDRESS ??
    '0x8004A818BFB912233c491871b3d84c89A494BD9e';
  const agentId = process.env.A2A_AGENT_ID;

  const agentCard = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: process.env.AGENT_NAME ?? 'AIOracleAgent',
    description:
      process.env.AGENT_DESCRIPTION ??
      'AI oracle agent specialized in ETH news sentiment execution',
    image:
      process.env.AGENT_IMAGE ??
      'https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/master/assets/erc8004.png',
    services: [
      {
        name: 'A2A',
        endpoint:
          process.env.AGENT_A2A_ENDPOINT ??
          'https://localhost/.well-known/agent-card.json',
        version: process.env.AGENT_A2A_VERSION ?? '0.3.0',
      },
      {
        name: 'EVM',
        endpoint: wallet.address,
      },
    ],
    x402Support: false,
    active: true,
    registrations: agentId
      ? [
          {
            agentId: Number(agentId),
            agentRegistry: `eip155:${chainId}:${identityRegistryAddress}`,
          },
        ]
      : [],
    supportedTrust: ['reputation', 'validation'],
  };

  const response = await fetch(
    'https://api.pinata.cloud/pinning/pinJSONToIPFS',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: agentCard,
        pinataMetadata: {
          name: `agent-card-${wallet.address.toLowerCase()}`,
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${text}`);
  }

  const body = (await response.json()) as PinataPinResponse;
  const agentUri = `ipfs://${body.IpfsHash}`;

  const outDir = path.join(process.cwd(), 'deployments');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'agent-card.json'),
    JSON.stringify({ agentUri, agentCard }, null, 2),
  );

  console.log(`Agent URI: ${agentUri}`);
  console.log('Saved deployments/agent-card.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
