import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { NewsService } from '../news/news.service';
import { AIOracleEngine } from '../core/ai-oracle.engine';
import { BlockchainService } from '../blockchain/blockchain.service';
import { NewsSentimentStrategy } from '../strategies/news-sentiment.strategy';
import { OracleExecutionError } from '../core/oracle-execution.error';

interface OracleNewsResponse {
  action: string;
  rawResponse: string;
  txHash: string | null;
}

@Controller('oracle')
export class OracleController {
  private readonly logger = new Logger(OracleController.name);

  constructor(
    private readonly newsService: NewsService,
    private readonly oracleEngine: AIOracleEngine,
    private readonly blockchainService: BlockchainService,
  ) {}

  @Post('news')
  @HttpCode(HttpStatus.OK)
  async runNewsSentiment(): Promise<OracleNewsResponse> {
    this.logger.log('POST /oracle/news triggered');

    let news: Awaited<ReturnType<NewsService['getEthNews']>>;
    let result: Awaited<ReturnType<AIOracleEngine['execute']>>;
    let blockchainResult: Awaited<
      ReturnType<BlockchainService['executeAction']>
    >;

    try {
      news = await this.newsService.getEthNews();
      result = await this.oracleEngine.execute(
        new NewsSentimentStrategy(),
        news,
      );
      blockchainResult = await this.blockchainService.executeAction(
        result.action,
      );
    } catch (err: unknown) {
      const message =
        err instanceof OracleExecutionError
          ? err.message
          : 'Unexpected oracle execution error';
      this.logger.error(message, err);
      throw new InternalServerErrorException(message);
    }

    return {
      action: result.action.type,
      rawResponse: result.rawResponse,
      txHash: blockchainResult?.txHash ?? null,
    };
  }
}
