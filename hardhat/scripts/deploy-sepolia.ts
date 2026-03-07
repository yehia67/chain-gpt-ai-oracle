import { ethers } from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';

const ERC8004_SEPOLIA_IDENTITY_REGISTRY =
  '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const ERC8004_SEPOLIA_REPUTATION_REGISTRY =
  '0x8004B663056A597Dffe9eCcC1965A193B7388713';

interface DeploymentOutput {
  network: string;
  chainId: number;
  deployer: string;
  oracle: string;
  validator: string;
  identityRegistry: string;
  validationRegistry: string;
  reputationRegistry: string;
  mockTradeExecutorV2: string;
  deployedAt: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const oracle = process.env.ORACLE_ADDRESS ?? deployer.address;
  const validator = process.env.VALIDATOR_ADDRESS ?? deployer.address;

  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Network chainId: ${network.chainId.toString()}`);
  console.log(`Oracle: ${oracle}`);
  console.log(`Validator: ${validator}`);
  console.log(
    `IdentityRegistry (ERC-8004): ${
      process.env.A2A_IDENTITY_REGISTRY_ADDRESS ??
      ERC8004_SEPOLIA_IDENTITY_REGISTRY
    }`,
  );
  console.log(
    `ReputationRegistry (ERC-8004): ${
      process.env.A2A_REPUTATION_REGISTRY_ADDRESS ??
      ERC8004_SEPOLIA_REPUTATION_REGISTRY
    }`,
  );

  const identityRegistryAddress =
    process.env.A2A_IDENTITY_REGISTRY_ADDRESS ??
    ERC8004_SEPOLIA_IDENTITY_REGISTRY;

  let validationRegistryAddress =
    process.env.A2A_VALIDATION_REGISTRY_ADDRESS ?? '';
  if (!validationRegistryAddress) {
    const ValidationRegistry = await ethers.getContractFactory('ValidationRegistry');
    const validationRegistry = await ValidationRegistry.deploy(validator);
    await validationRegistry.waitForDeployment();
    validationRegistryAddress = await validationRegistry.getAddress();
    console.log(
      `ValidationRegistry deployed (project-local): ${validationRegistryAddress}`,
    );
  } else {
    console.log(`ValidationRegistry (env): ${validationRegistryAddress}`);
  }

  const reputationRegistryAddress =
    process.env.A2A_REPUTATION_REGISTRY_ADDRESS ??
    ERC8004_SEPOLIA_REPUTATION_REGISTRY;

  const MockTradeExecutorV2 = await ethers.getContractFactory('MockTradeExecutorV2');
  const mockTradeExecutorV2 = await MockTradeExecutorV2.deploy(
    oracle,
    validationRegistryAddress,
  );
  await mockTradeExecutorV2.waitForDeployment();

  const output: DeploymentOutput = {
    network: 'sepolia',
    chainId: Number(network.chainId),
    deployer: deployer.address,
    oracle,
    validator,
    identityRegistry: identityRegistryAddress,
    validationRegistry: validationRegistryAddress,
    reputationRegistry: reputationRegistryAddress,
    mockTradeExecutorV2: await mockTradeExecutorV2.getAddress(),
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(process.cwd(), 'deployments');
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const outPath = path.join(deploymentsDir, 'sepolia.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log('\nDeployment complete:');
  console.log(JSON.stringify(output, null, 2));
  console.log('\nSet backend env:');
  console.log(`A2A_IDENTITY_REGISTRY_ADDRESS=${output.identityRegistry}`);
  console.log(`A2A_VALIDATION_REGISTRY_ADDRESS=${output.validationRegistry}`);
  console.log(`A2A_REPUTATION_REGISTRY_ADDRESS=${output.reputationRegistry}`);
  console.log(`CONTRACT_ADDRESS=${output.mockTradeExecutorV2}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
