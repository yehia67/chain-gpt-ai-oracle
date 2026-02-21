import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AIOracleEngine } from './ai-oracle.engine';

@Module({
  providers: [LlmService, AIOracleEngine],
  exports: [AIOracleEngine],
})
export class CoreModule {}
