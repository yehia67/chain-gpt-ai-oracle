import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { OracleModule } from './oracle/oracle.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule, OracleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
