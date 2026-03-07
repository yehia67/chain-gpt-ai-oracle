import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('A2A ERC-8004 MVP contracts', () => {
  it('requires verified validation before trade execution and blocks replay', async () => {
    const [deployer, validator] = await ethers.getSigners();

    const ValidationRegistry = await ethers.getContractFactory('ValidationRegistry');
    const validationRegistry = await ValidationRegistry.deploy(validator.address);
    await validationRegistry.waitForDeployment();

    const MockTradeExecutorV2 = await ethers.getContractFactory('MockTradeExecutorV2');
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
      .requestValidation.staticCall(deployer.address, dataHash, 'LLM_OUTPUT_HASH');

    await validationRegistry
      .connect(deployer)
      .requestValidation(deployer.address, dataHash, 'LLM_OUTPUT_HASH');

    await validationRegistry
      .connect(validator)
      .submitValidationResponse(requestId, validator.address, 'ipfs://proof', true);

    await expect(trade.connect(deployer).buy(requestId))
      .to.emit(trade, 'TradeExecuted')
      .withArgs('BUY', requestId, deployer.address);

    await expect(trade.connect(deployer).sell(requestId)).to.be.revertedWithCustomError(
      trade,
      'ValidationAlreadyConsumed',
    );
  });
});
