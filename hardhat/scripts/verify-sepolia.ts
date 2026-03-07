import { run } from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';

interface DeploymentOutput {
  oracle: string;
  validator: string;
  identityRegistry: string;
  validationRegistry: string;
  reputationRegistry: string;
  mockTradeExecutorV2: string;
}

async function verify(address: string, constructorArguments: unknown[]) {
  try {
    await run('verify:verify', {
      address,
      constructorArguments,
    });
    console.log(`Verified ${address}`);
  } catch (error) {
    console.error(`Failed to verify ${address}`, error);
  }
}

async function main() {
  const deploymentPath = path.join(process.cwd(), 'deployments', 'sepolia.json');
  const raw = fs.readFileSync(deploymentPath, 'utf8');
  const deployment = JSON.parse(raw) as DeploymentOutput;

  await verify(deployment.validationRegistry, [deployment.validator]);
  await verify(deployment.mockTradeExecutorV2, [
    deployment.oracle,
    deployment.validationRegistry,
  ]);

  if (process.env.VERIFY_ERC8004_REGISTRIES === 'true') {
    await verify(deployment.identityRegistry, []);
    await verify(deployment.reputationRegistry, []);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
