import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeneralChat } from '@chaingpt/generalchat';
import { OracleExecutionError } from './oracle-execution.error';

interface ChatBlobResponse {
  data: {
    bot: string;
  };
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly chat: GeneralChat;

  constructor(private readonly configService: ConfigService) {
    this.chat = new GeneralChat({
      apiKey: this.configService.getOrThrow<string>('CHAINGPT_API_KEY'),
    });
  }

  async sendPrompt(prompt: string): Promise<string> {
    this.logger.log('Sending prompt to ChainGPT Web3 LLM');

    let response: ChatBlobResponse;
    try {
      response = (await this.chat.createChatBlob({
        question: prompt,
        chatHistory: 'off',
      })) as ChatBlobResponse;
    } catch (err: unknown) {
      throw new OracleExecutionError('LLM request failed', err);
    }

    const raw = response.data.bot;
    this.logger.log(`Raw LLM response received (${raw.length} chars)`);
    return raw;
  }
}
