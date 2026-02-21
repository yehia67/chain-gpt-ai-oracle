import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        CHAINGPT_API_KEY: Joi.string().required(),
        RPC_URL: Joi.string().uri().required(),
        PRIVATE_KEY: Joi.string().required(),
        CONTRACT_ADDRESS: Joi.string().required(),
      }),
    }),
  ],
})
export class ConfigModule {}
