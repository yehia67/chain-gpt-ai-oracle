import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, ethers, type ContractTransactionResponse } from 'ethers';
import {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  VALIDATION_REGISTRY_ABI,
} from './abi';
import { OracleExecutionError } from '../core/oracle-execution.error';

interface PinataPinResponse {
  IpfsHash: string;
}

type IdentityRegistryContract = Contract & {
  register(agentUri: string): Promise<ContractTransactionResponse>;
  tokenURI(agentId: bigint): Promise<string>;
};

type ValidationRegistryContract = Contract & {
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
  getValidation(
    requestId: bigint,
  ): Promise<[boolean, string, boolean, string, bigint]>;
};

type ReputationRegistryContract = Contract & {
  giveFeedback(
    agentId: bigint,
    value: number,
    valueDecimals: number,
    tag1: string,
    tag2: string,
    endpoint: string,
    feedbackUri: string,
    feedbackHash: string,
  ): Promise<ContractTransactionResponse>;
  getLastIndex(agentId: bigint, serverAddress: string): Promise<bigint>;
  readFeedback(
    agentId: bigint,
    serverAddress: string,
    index: bigint,
  ): Promise<[bigint, number, string, string, boolean]>;
};

export interface ValidationSnapshot {
  verified: boolean;
  proofUri: string;
  responded: boolean;
  validator: string;
  timestamp: bigint;
}

@Injectable()
export class A2aService {
  private readonly logger = new Logger(A2aService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer: ethers.Wallet;
  private readonly identityRegistry: IdentityRegistryContract;
  private readonly validationRegistry: ValidationRegistryContract;
  private readonly reputationRegistry: ReputationRegistryContract;
  private readonly validatorAddress: string;
  private readonly pinataJwt: string;
  private readonly agentId?: bigint;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.getOrThrow<string>('RPC_URL');
    const privateKey = this.configService.getOrThrow<string>('PRIVATE_KEY');
    const identityRegistryAddress = this.configService.getOrThrow<string>(
      'A2A_IDENTITY_REGISTRY_ADDRESS',
    );
    const validationRegistryAddress = this.configService.getOrThrow<string>(
      'A2A_VALIDATION_REGISTRY_ADDRESS',
    );
    const reputationRegistryAddress = this.configService.getOrThrow<string>(
      'A2A_REPUTATION_REGISTRY_ADDRESS',
    );

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.validatorAddress =
      this.configService.get<string>('VALIDATOR_ADDRESS') ??
      this.signer.address;
    this.pinataJwt = this.configService.getOrThrow<string>('PINATA_JWT');
    const configuredAgentId = this.configService.get<string>('A2A_AGENT_ID');
    this.agentId =
      configuredAgentId !== undefined && configuredAgentId !== ''
        ? BigInt(configuredAgentId)
        : undefined;

    this.identityRegistry = new Contract(
      identityRegistryAddress,
      IDENTITY_REGISTRY_ABI,
      this.signer,
    ) as IdentityRegistryContract;
    this.validationRegistry = new Contract(
      validationRegistryAddress,
      VALIDATION_REGISTRY_ABI,
      this.signer,
    ) as ValidationRegistryContract;
    this.reputationRegistry = new Contract(
      reputationRegistryAddress,
      REPUTATION_REGISTRY_ABI,
      this.signer,
    ) as ReputationRegistryContract;
  }

  getSignerAddress(): string {
    return this.signer.address;
  }

  async registerAgent(agentAddress: string, agentUri: string): Promise<string> {
    try {
      if (agentAddress.toLowerCase() !== this.signer.address.toLowerCase()) {
        this.logger.warn(
          `Ignoring agentAddress=${agentAddress}; ERC-8004 register() mints to caller address ${this.signer.address}`,
        );
      }

      const tx: ContractTransactionResponse =
        await this.identityRegistry.register(agentUri);
      await tx.wait();
      return tx.hash;
    } catch (err: unknown) {
      throw new OracleExecutionError('Failed to register agent identity', err);
    }
  }

  async getAgent(agentAddress: string): Promise<string> {
    void agentAddress;
    const agentId = this.getConfiguredAgentId();
    return await this.identityRegistry.tokenURI(agentId);
  }

  async requestValidation(
    dataHash: string,
    validationType = 'LLM_OUTPUT_HASH',
  ): Promise<{ requestId: bigint; txHash: string }> {
    let requestId: bigint;
    try {
      requestId = await this.validationRegistry.requestValidation.staticCall(
        this.signer.address,
        dataHash,
        validationType,
      );

      const tx: ContractTransactionResponse =
        await this.validationRegistry.requestValidation(
          this.signer.address,
          dataHash,
          validationType,
        );
      await tx.wait();

      this.logger.log(
        `Validation requested requestId=${requestId.toString()} txHash=${tx.hash}`,
      );

      return { requestId, txHash: tx.hash };
    } catch (err: unknown) {
      throw new OracleExecutionError('Failed to request validation', err);
    }
  }

  async submitValidationResponse(
    requestId: bigint,
    proofUri: string,
    verified: boolean,
  ): Promise<string> {
    try {
      const tx: ContractTransactionResponse =
        await this.validationRegistry.submitValidationResponse(
          requestId,
          this.validatorAddress,
          proofUri,
          verified,
        );
      await tx.wait();
      return tx.hash;
    } catch (err: unknown) {
      throw new OracleExecutionError(
        `Failed to submit validation response for requestId=${requestId.toString()}`,
        err,
      );
    }
  }

  async getValidation(requestId: bigint): Promise<ValidationSnapshot> {
    const tuple = await this.validationRegistry.getValidation(requestId);

    return {
      verified: tuple[0],
      proofUri: tuple[1],
      responded: tuple[2],
      validator: tuple[3],
      timestamp: tuple[4],
    };
  }

  async submitFeedback(
    serverAddress: string,
    feedbackUri: string,
    clientAddress = this.signer.address,
  ): Promise<string> {
    try {
      void serverAddress;
      void clientAddress;

      const agentId = this.getConfiguredAgentId();
      const feedbackHash = ethers.keccak256(ethers.toUtf8Bytes(feedbackUri));
      const tx: ContractTransactionResponse =
        await this.reputationRegistry.giveFeedback(
          agentId,
          100,
          0,
          'execution',
          'news-sentiment',
          '',
          feedbackUri,
          feedbackHash,
        );
      await tx.wait();
      return tx.hash;
    } catch (err: unknown) {
      throw new OracleExecutionError(
        'Failed to submit reputation feedback',
        err,
      );
    }
  }

  async getFeedback(serverAddress: string): Promise<string[]> {
    const agentId = this.getConfiguredAgentId();
    const lastIndex = await this.reputationRegistry.getLastIndex(
      agentId,
      serverAddress,
    );
    const feedback: string[] = [];

    for (let i = 1n; i <= lastIndex; i += 1n) {
      const item = await this.reputationRegistry.readFeedback(
        agentId,
        serverAddress,
        i,
      );
      feedback.push(
        JSON.stringify({
          value: item[0].toString(),
          valueDecimals: item[1],
          tag1: item[2],
          tag2: item[3],
          isRevoked: item[4],
        }),
      );
    }

    return feedback;
  }

  async pinJson(
    name: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const response = await fetch(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.pinataJwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pinataMetadata: { name },
          pinataContent: payload,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new OracleExecutionError(
        `Pinata upload failed with status=${response.status}: ${body}`,
      );
    }

    const data = (await response.json()) as PinataPinResponse;
    return `ipfs://${data.IpfsHash}`;
  }

  private getConfiguredAgentId(): bigint {
    if (this.agentId === undefined) {
      throw new OracleExecutionError(
        'A2A_AGENT_ID is required for ERC-8004 identity/reputation calls',
      );
    }

    return this.agentId;
  }
}
