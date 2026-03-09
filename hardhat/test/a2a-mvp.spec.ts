import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { ContractTransactionResponse, Signer } from 'ethers';

type ValidationRegistryContract = {
  interface: unknown;
  getAddress(): Promise<string>;
  waitForDeployment(): Promise<unknown>;
  connect(runner: Signer): ValidationRegistryContract;
  requestValidation: {
    (
      server: string,
      dataHash: string,
      validationType: string,
    ): Promise<ContractTransactionResponse>;
    staticCall(
      server: string,
      dataHash: string,
      validationType: string,
    ): Promise<bigint>;
  };
  submitValidationResponse(
    requestId: bigint,
    validator: string,
    proofUri: string,
    verified: boolean,
  ): Promise<ContractTransactionResponse>;
};

type MockTradeExecutorV2Contract = {
  interface: unknown;
  waitForDeployment(): Promise<unknown>;
  connect(runner: Signer): MockTradeExecutorV2Contract;
  buy(requestId: bigint): Promise<ContractTransactionResponse>;
  sell(requestId: bigint): Promise<ContractTransactionResponse>;
};

interface DeployableFactory<TContract> {
  deploy(...args: unknown[]): Promise<TContract>;
}

describe('A2A ERC-8004 MVP contracts', () => {
  it('requires verified validation before trade execution and blocks replay', async () => {
    const [deployer, validator] = await ethers.getSigners();

    const ValidationRegistry = (await ethers.getContractFactory(
      'ValidationRegistry',
    )) as unknown as DeployableFactory<ValidationRegistryContract>;
    const validationRegistry = await ValidationRegistry.deploy(
      validator.address,
    );
    await validationRegistry.waitForDeployment();

    const MockTradeExecutorV2 = (await ethers.getContractFactory(
      'MockTradeExecutorV2',
    )) as unknown as DeployableFactory<MockTradeExecutorV2Contract>;
    const trade = await MockTradeExecutorV2.deploy(
      deployer.address,
      await validationRegistry.getAddress(),
    );
    await trade.waitForDeployment();

    await expect(trade.connect(deployer).buy(1n)).to.be.revertedWithCustomError(
      trade,
      'ValidationNotVerified',
    );

    const dataHash = ethers.keccak256(ethers.toUtf8Bytes('task-payload'));
    const requestId = await validationRegistry
      .connect(deployer)
      .requestValidation.staticCall(
        deployer.address,
        dataHash,
        'LLM_OUTPUT_HASH',
      );

    await validationRegistry
      .connect(deployer)
      .requestValidation(deployer.address, dataHash, 'LLM_OUTPUT_HASH');

    await validationRegistry
      .connect(validator)
      .submitValidationResponse(
        requestId,
        validator.address,
        'ipfs://proof',
        true,
      );

    await expect(trade.connect(deployer).buy(requestId))
      .to.emit(trade, 'TradeExecuted')
      .withArgs('BUY', requestId, deployer.address);

    await expect(
      trade.connect(deployer).sell(requestId),
    ).to.be.revertedWithCustomError(trade, 'ValidationAlreadyConsumed');
  });
});
