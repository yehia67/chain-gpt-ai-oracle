import { Module } from '@nestjs/common';
import { OracleController } from './oracle.controller';
import { CoreModule } from '../core/core.module';
import { NewsModule } from '../news/news.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [CoreModule, NewsModule, BlockchainModule],
  controllers: [OracleController],
})
export class OracleModule {}
