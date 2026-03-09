import { Module } from '@nestjs/common';
import { OracleController } from './oracle.controller';
import { CoreModule } from '../core/core.module';
import { NewsModule } from '../news/news.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { A2aModule } from '../a2a/a2a.module';
import { OracleTaskService } from './oracle-task.service';
import { OracleWorkerService } from './oracle-worker.service';
import { X402Module } from '../x402/x402.module';

@Module({
  imports: [CoreModule, NewsModule, BlockchainModule, A2aModule, X402Module],
  controllers: [OracleController],
  providers: [OracleTaskService, OracleWorkerService],
})
export class OracleModule {}
