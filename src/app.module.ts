import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { OracleModule } from './oracle/oracle.module';

@Module({
  imports: [ConfigModule, OracleModule],
})
export class AppModule {}
