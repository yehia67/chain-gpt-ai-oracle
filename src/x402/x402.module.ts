import { Module } from '@nestjs/common';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { X402ExecutionService } from './x402-execution.service';

@Module({
  imports: [BlockchainModule],
  providers: [X402ExecutionService],
  exports: [X402ExecutionService],
})
export class X402Module {}
