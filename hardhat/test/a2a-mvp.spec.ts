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

  it('registers and resolves identities', async () => {
    const [agent, other] = await ethers.getSigners();

    const IdentityRegistry = await ethers.getContractFactory('IdentityRegistry');
    const identity = await IdentityRegistry.deploy();
    await identity.waitForDeployment();

    await expect(
      identity.connect(other).registerAgent(agent.address, 'ipfs://agent-card'),
    ).to.be.revertedWithCustomError(identity, 'UnauthorizedRegistrar');

    await identity.connect(agent).registerAgent(agent.address, 'ipfs://agent-card');

    expect(await identity.getAgent(agent.address)).to.equal('ipfs://agent-card');
  });

  it('stores feedback URIs by server', async () => {
    const [client, server, other] = await ethers.getSigners();

    const ReputationRegistry = await ethers.getContractFactory('ReputationRegistry');
    const reputation = await ReputationRegistry.deploy();
    await reputation.waitForDeployment();

    await expect(
      reputation.connect(other).submitFeedback(client.address, server.address, 'ipfs://fbk-1'),
    ).to.be.revertedWithCustomError(reputation, 'UnauthorizedClient');

    await reputation
      .connect(client)
      .submitFeedback(client.address, server.address, 'ipfs://fbk-1');

    const feedback = await reputation.getFeedback(server.address);
    expect(feedback).to.deep.equal(['ipfs://fbk-1']);
  });
});
