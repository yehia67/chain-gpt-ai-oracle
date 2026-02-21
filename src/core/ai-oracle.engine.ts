import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import {
  AIOracleStrategy,
  OracleAction,
  OracleDecision,
} from '../strategies/oracle-strategy.interface';
import { OracleExecutionError } from './oracle-execution.error';

export interface OracleResult {
  action: OracleAction;
  rawResponse: string;
}

@Injectable()
export class AIOracleEngine {
  private readonly logger = new Logger(AIOracleEngine.name);

  constructor(private readonly llmService: LlmService) {}

  async execute<TInput>(
    strategy: AIOracleStrategy<TInput>,
    input: TInput,
  ): Promise<OracleResult> {
    const prompt = strategy.buildPrompt(input);
    this.logger.log('Prompt built, calling LLM');

    const rawResponse = await this.llmService.sendPrompt(prompt);

    let decision: OracleDecision;
    try {
      decision = strategy.parseResponse(rawResponse);
    } catch (err: unknown) {
      this.logger.error(
        `Decision validation failed. Raw LLM output: ${rawResponse}`,
      );
      if (err instanceof OracleExecutionError) {
        throw err;
      }
      throw new OracleExecutionError(
        'Unexpected error during response parsing',
        err,
      );
    }

    const action = strategy.mapToTransaction(decision);
    this.logger.log(`Decision mapped to action: ${action.type}`);

    return { action, rawResponse };
  }
}
