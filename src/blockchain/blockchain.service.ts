import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { MOCK_TRADE_EXECUTOR_ABI } from './abi';
import { OracleAction } from '../strategies/oracle-strategy.interface';
import { OracleExecutionError } from '../core/oracle-execution.error';

export interface BlockchainResult {
  txHash: string;
  action: string;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer: ethers.Wallet;
  private readonly contract: ethers.Contract;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.getOrThrow<string>('RPC_URL');
    const privateKey = this.configService.getOrThrow<string>('PRIVATE_KEY');
    const contractAddress =
      this.configService.getOrThrow<string>('CONTRACT_ADDRESS');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(
      contractAddress,
      MOCK_TRADE_EXECUTOR_ABI,
      this.signer,
    );
  }

  async executeAction(action: OracleAction): Promise<BlockchainResult | null> {
    if (action.type === 'NO_ACTION') {
      this.logger.log('Action is NO_ACTION — skipping blockchain execution');
      return null;
    }

    const methodName = action.type === 'BUY' ? 'buy' : 'sell';
    this.logger.log(`Executing contract method: ${methodName}()`);

    let tx: ethers.TransactionResponse;
    try {
      tx = await (
        this.contract[methodName] as (
          ...args: unknown[]
        ) => Promise<ethers.TransactionResponse>
      )();
    } catch (err: unknown) {
      throw new OracleExecutionError(
        `Transaction failed for action ${action.type}`,
        err,
      );
    }

    this.logger.log(`Transaction submitted: ${tx.hash}`);
    await tx.wait();
    this.logger.log(`Transaction confirmed: ${tx.hash}`);

    return { txHash: tx.hash, action: action.type };
  }
}
