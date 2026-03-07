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
        A2A_IDENTITY_REGISTRY_ADDRESS: Joi.string().required(),
        A2A_VALIDATION_REGISTRY_ADDRESS: Joi.string().required(),
        A2A_REPUTATION_REGISTRY_ADDRESS: Joi.string().required(),
        PINATA_JWT: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        CHAIN_ID: Joi.number().integer().default(11155111),
        VALIDATOR_ADDRESS: Joi.string().optional(),
        A2A_AGENT_ID: Joi.string().optional(),
        WORKER_POLL_MS: Joi.number().integer().min(1000).default(10000),
      }),
    }),
  ],
})
export class ConfigModule {}
