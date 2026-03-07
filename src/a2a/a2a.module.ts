import { Module } from '@nestjs/common';
import { A2aService } from './a2a.service';

@Module({
  providers: [A2aService],
  exports: [A2aService],
})
export class A2aModule {}
