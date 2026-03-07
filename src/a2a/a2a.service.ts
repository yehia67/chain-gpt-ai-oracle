import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, ethers } from 'ethers';
import {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  VALIDATION_REGISTRY_ABI,
} from './abi';
import { OracleExecutionError } from '../core/oracle-execution.error';

interface PinataPinResponse {
  IpfsHash: string;
}

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
  private readonly identityRegistry: Contract;
  private readonly validationRegistry: Contract;
  private readonly reputationRegistry: Contract;
  private readonly validatorAddress: string;
  private readonly pinataJwt: string;

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
      this.configService.get<string>('VALIDATOR_ADDRESS') ?? this.signer.address;
    this.pinataJwt = this.configService.getOrThrow<string>('PINATA_JWT');

    this.identityRegistry = new Contract(
      identityRegistryAddress,
      IDENTITY_REGISTRY_ABI,
      this.signer,
    );
    this.validationRegistry = new Contract(
      validationRegistryAddress,
      VALIDATION_REGISTRY_ABI,
      this.signer,
    );
    this.reputationRegistry = new Contract(
      reputationRegistryAddress,
      REPUTATION_REGISTRY_ABI,
      this.signer,
    );
  }

  getSignerAddress(): string {
    return this.signer.address;
  }

  async registerAgent(agentAddress: string, agentUri: string): Promise<string> {
    try {
      const tx = await this.identityRegistry.registerAgent(agentAddress, agentUri);
      await tx.wait();
      return tx.hash as string;
    } catch (err: unknown) {
      throw new OracleExecutionError('Failed to register agent identity', err);
    }
  }

  async getAgent(agentAddress: string): Promise<string> {
    return (await this.identityRegistry.getAgent(agentAddress)) as string;
  }

  async requestValidation(
    dataHash: string,
    validationType = 'LLM_OUTPUT_HASH',
  ): Promise<{ requestId: bigint; txHash: string }> {
    let requestId: bigint;
    try {
      requestId = (await this.validationRegistry.requestValidation.staticCall(
        this.signer.address,
        dataHash,
        validationType,
      )) as bigint;

      const tx = await this.validationRegistry.requestValidation(
        this.signer.address,
        dataHash,
        validationType,
      );
      await tx.wait();

      this.logger.log(
        `Validation requested requestId=${requestId.toString()} txHash=${tx.hash}`,
      );

      return { requestId, txHash: tx.hash as string };
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
      const tx = await this.validationRegistry.submitValidationResponse(
        requestId,
        this.validatorAddress,
        proofUri,
        verified,
      );
      await tx.wait();
      return tx.hash as string;
    } catch (err: unknown) {
      throw new OracleExecutionError(
        `Failed to submit validation response for requestId=${requestId.toString()}`,
        err,
      );
    }
  }

  async getValidation(requestId: bigint): Promise<ValidationSnapshot> {
    const tuple = (await this.validationRegistry.getValidation(requestId)) as [
      boolean,
      string,
      boolean,
      string,
      bigint,
    ];

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
      const tx = await this.reputationRegistry.submitFeedback(
        clientAddress,
        serverAddress,
        feedbackUri,
      );
      await tx.wait();
      return tx.hash as string;
    } catch (err: unknown) {
      throw new OracleExecutionError('Failed to submit reputation feedback', err);
    }
  }

  async getFeedback(serverAddress: string): Promise<string[]> {
    return (await this.reputationRegistry.getFeedback(serverAddress)) as string[];
  }

  async pinJson(name: string, payload: Record<string, unknown>): Promise<string> {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.pinataJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataMetadata: { name },
        pinataContent: payload,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new OracleExecutionError(
        `Pinata upload failed with status=${response.status}: ${body}`,
      );
    }

    const data = (await response.json()) as PinataPinResponse;
    return `ipfs://${data.IpfsHash}`;
  }
}
