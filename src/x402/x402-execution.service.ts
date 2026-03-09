import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { OracleExecutionError } from '../core/oracle-execution.error';
import { OracleAction } from '../strategies/oracle-strategy.interface';
import {
  BlockchainResult,
  BlockchainService,
} from '../blockchain/blockchain.service';
import {
  SignedX402Condition,
  X402Condition,
  X402ExecutionMode,
  X402ExecutionReceipt,
} from './x402.types';

interface ExecuteSignedConditionParams {
  action: OracleAction;
  validationRequestId: bigint | null;
  taskId: string;
  dataHash: string | null;
}

@Injectable()
export class X402ExecutionService {
  private readonly logger = new Logger(X402ExecutionService.name);
  private readonly signer: ethers.Wallet;
  private readonly chainId: number;
  private readonly contractAddress: string;
  private readonly mode: X402ExecutionMode;
  private readonly facilitatorUrl?: string;
  private readonly conditionTtlSec: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly blockchainService: BlockchainService,
  ) {
    const privateKey = this.configService.getOrThrow<string>('PRIVATE_KEY');
    this.chainId = Number(
      this.configService.get<number>('CHAIN_ID') ?? 11155111,
    );
    this.contractAddress =
      this.configService.getOrThrow<string>('CONTRACT_ADDRESS');
    this.mode = this.resolveExecutionMode(
      this.configService.get<string>('X402_EXECUTION_MODE'),
    );
    this.facilitatorUrl = this.configService.get<string>(
      'X402_FACILITATOR_URL',
    );
    this.conditionTtlSec = Number(
      this.configService.get<number>('X402_CONDITION_TTL_SEC') ?? 300,
    );
    this.signer = new ethers.Wallet(privateKey);

    if (this.mode === 'facilitator' && !this.facilitatorUrl) {
      throw new OracleExecutionError(
        'X402_FACILITATOR_URL is required when X402_EXECUTION_MODE=facilitator',
      );
    }
  }

  async executeSignedCondition(
    params: ExecuteSignedConditionParams,
  ): Promise<X402ExecutionReceipt | null> {
    const { action, validationRequestId, taskId, dataHash } = params;

    if (action.type === 'NO_ACTION') {
      return null;
    }

    if (validationRequestId === null || !dataHash) {
      throw new OracleExecutionError(
        `Cannot execute ${action.type} without validationRequestId and dataHash`,
      );
    }

    const signedCondition = await this.buildSignedCondition({
      taskId,
      action: action.type,
      validationRequestId,
      dataHash,
    });

    const verificationRef = await this.verifySignedCondition(signedCondition);

    const blockchainResult = await this.blockchainService.executeAction(
      action,
      validationRequestId,
      taskId,
    );

    if (!blockchainResult) {
      throw new OracleExecutionError(
        `Expected blockchain execution result for action ${action.type}`,
      );
    }

    const settlementRef = await this.settleCondition(
      signedCondition,
      blockchainResult,
      verificationRef,
    );

    return {
      txHash: blockchainResult.txHash,
      mode: this.mode,
      conditionHash: signedCondition.conditionHash,
      conditionSignature: signedCondition.signature,
      settlementRef,
    };
  }

  private async buildSignedCondition(input: {
    taskId: string;
    action: 'BUY' | 'SELL';
    validationRequestId: bigint;
    dataHash: string;
  }): Promise<SignedX402Condition> {
    const method = input.action === 'BUY' ? 'buy' : 'sell';
    const condition: X402Condition = {
      version: 'x402-execution-v1',
      taskId: input.taskId,
      action: input.action,
      method,
      contractAddress: this.contractAddress,
      chainId: this.chainId,
      validationRequestId: input.validationRequestId.toString(),
      dataHash: input.dataHash,
      nonce: ethers.hexlify(ethers.randomBytes(16)),
      expiresAt: new Date(
        Date.now() + this.conditionTtlSec * 1000,
      ).toISOString(),
    };

    const conditionHash = this.hashCondition(condition);
    const signature = await this.signer.signMessage(
      ethers.getBytes(conditionHash),
    );

    return {
      condition,
      conditionHash,
      signature,
      signer: this.signer.address,
    };
  }

  private async verifySignedCondition(
    signedCondition: SignedX402Condition,
  ): Promise<string> {
    const expectedHash = this.hashCondition(signedCondition.condition);
    if (expectedHash !== signedCondition.conditionHash) {
      throw new OracleExecutionError('X402 condition hash mismatch');
    }

    const expiresAtMs = Date.parse(signedCondition.condition.expiresAt);
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      throw new OracleExecutionError('X402 condition is expired');
    }

    const recovered = ethers.verifyMessage(
      ethers.getBytes(signedCondition.conditionHash),
      signedCondition.signature,
    );

    if (recovered.toLowerCase() !== signedCondition.signer.toLowerCase()) {
      throw new OracleExecutionError('Invalid X402 condition signature');
    }

    if (this.mode === 'facilitator') {
      return this.verifyWithFacilitator(signedCondition);
    }

    this.logger.log(
      `[taskId=${signedCondition.condition.taskId}] X402 verification complete in local mode`,
    );
    return `local-verify:${signedCondition.conditionHash}`;
  }

  private async settleCondition(
    signedCondition: SignedX402Condition,
    blockchainResult: BlockchainResult,
    verificationRef: string,
  ): Promise<string> {
    if (this.mode === 'facilitator') {
      return this.settleWithFacilitator(
        signedCondition,
        blockchainResult,
        verificationRef,
      );
    }

    this.logger.log(
      `[taskId=${signedCondition.condition.taskId}] X402 settlement complete in local mode tx=${blockchainResult.txHash}`,
    );
    return `local-settle:${signedCondition.conditionHash}`;
  }

  private async verifyWithFacilitator(
    signedCondition: SignedX402Condition,
  ): Promise<string> {
    const response = await fetch(this.getFacilitatorEndpoint('/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        condition: signedCondition.condition,
        conditionHash: signedCondition.conditionHash,
        signature: signedCondition.signature,
        signer: signedCondition.signer,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new OracleExecutionError(
        `X402 facilitator verify failed status=${response.status}: ${body}`,
      );
    }

    const payload = await this.readJsonObject(response);
    const isValid = this.extractBoolean(payload, [
      'verified',
      'valid',
      'approved',
    ]);
    if (!isValid) {
      throw new OracleExecutionError('X402 facilitator rejected condition');
    }

    return (
      this.extractString(payload, [
        'verificationId',
        'id',
        'reference',
        'verificationRef',
      ]) ?? `facilitator-verify:${signedCondition.conditionHash}`
    );
  }

  private async settleWithFacilitator(
    signedCondition: SignedX402Condition,
    blockchainResult: BlockchainResult,
    verificationRef: string,
  ): Promise<string> {
    const response = await fetch(this.getFacilitatorEndpoint('/settle'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        condition: signedCondition.condition,
        conditionHash: signedCondition.conditionHash,
        signature: signedCondition.signature,
        signer: signedCondition.signer,
        txHash: blockchainResult.txHash,
        verificationRef,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new OracleExecutionError(
        `X402 facilitator settle failed status=${response.status}: ${body}`,
      );
    }

    const payload = await this.readJsonObject(response);
    return (
      this.extractString(payload, [
        'settlementId',
        'id',
        'reference',
        'settlementRef',
      ]) ?? `facilitator-settle:${signedCondition.conditionHash}`
    );
  }

  private hashCondition(condition: X402Condition): string {
    return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(condition)));
  }

  private getFacilitatorEndpoint(path: '/verify' | '/settle'): string {
    if (!this.facilitatorUrl) {
      throw new OracleExecutionError(
        'X402_FACILITATOR_URL is required for facilitator mode',
      );
    }

    return `${this.facilitatorUrl.replace(/\/$/, '')}${path}`;
  }

  private resolveExecutionMode(
    configuredMode: string | undefined,
  ): X402ExecutionMode {
    if (!configuredMode) {
      return 'local';
    }

    const normalized = configuredMode.toLowerCase();
    if (normalized === 'local' || normalized === 'facilitator') {
      return normalized;
    }

    throw new OracleExecutionError(
      `Unsupported X402_EXECUTION_MODE=${configuredMode}`,
    );
  }

  private async readJsonObject(
    response: Response,
  ): Promise<Record<string, unknown>> {
    const payload = (await response.json()) as unknown;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }
    return payload as Record<string, unknown>;
  }

  private extractBoolean(
    payload: Record<string, unknown>,
    keys: string[],
  ): boolean {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'boolean') {
        return value;
      }
    }
    return false;
  }

  private extractString(
    payload: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }
    return null;
  }
}
