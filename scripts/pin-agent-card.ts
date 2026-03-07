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

  const agentCard = {
    agent_id: `eip155:${chainId}:${wallet.address}`,
    name: process.env.AGENT_NAME ?? 'AIOracleAgent',
    description:
      process.env.AGENT_DESCRIPTION ??
      'AI oracle agent specialized in ETH news sentiment execution',
    capabilities: ['data_analysis', 'onchain_query', 'sentiment_classification'],
    evm_address: wallet.address,
    schemas: ['erc8004/identity/v1'],
  };

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
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
  });

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
