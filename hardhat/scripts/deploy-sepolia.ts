import { ethers } from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';

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

  const IdentityRegistry = await ethers.getContractFactory('IdentityRegistry');
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();

  const ValidationRegistry = await ethers.getContractFactory('ValidationRegistry');
  const validationRegistry = await ValidationRegistry.deploy(validator);
  await validationRegistry.waitForDeployment();

  const ReputationRegistry = await ethers.getContractFactory('ReputationRegistry');
  const reputationRegistry = await ReputationRegistry.deploy();
  await reputationRegistry.waitForDeployment();

  const MockTradeExecutorV2 = await ethers.getContractFactory('MockTradeExecutorV2');
  const mockTradeExecutorV2 = await MockTradeExecutorV2.deploy(
    oracle,
    await validationRegistry.getAddress(),
  );
  await mockTradeExecutorV2.waitForDeployment();

  const output: DeploymentOutput = {
    network: 'sepolia',
    chainId: Number(network.chainId),
    deployer: deployer.address,
    oracle,
    validator,
    identityRegistry: await identityRegistry.getAddress(),
    validationRegistry: await validationRegistry.getAddress(),
    reputationRegistry: await reputationRegistry.getAddress(),
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
