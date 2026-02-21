import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AINews } from '@chaingpt/ainews';

export interface NewsItem {
  title: string;
  description: string;
}

interface AiNewsRow {
  title?: string;
  description?: string;
}

interface AiNewsResponse {
  data: {
    rows: AiNewsRow[];
  };
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly ainews: AINews;

  constructor(private readonly configService: ConfigService) {
    this.ainews = new AINews({
      apiKey: this.configService.getOrThrow<string>('CHAINGPT_API_KEY'),
    });
  }

  async getEthNews(): Promise<NewsItem[]> {
    this.logger.log('Fetching ETH news from ChainGPT AI News SDK');

    const response = await this.ainews.getNews({
      tokenId: [80],
      limit: 3,
      sortBy: 'createdAt',
    });

    this.logger.debug(`Raw SDK response: ${JSON.stringify(response)}`);

    const rawResponse = response as any;

    if (!rawResponse?.data || !Array.isArray(rawResponse.data)) {
      this.logger.error(
        `Unexpected response structure: ${JSON.stringify(response)}`,
      );
      throw new Error('AI News SDK returned unexpected response structure');
    }

    if (rawResponse.data.length === 0) {
      this.logger.warn('No news items returned from AI News SDK');
      return [
        {
          title: 'No recent ETH news available',
          description: 'The AI News SDK returned no results for ETH.',
        },
      ];
    }

    const items: NewsItem[] = rawResponse.data.map((item: any) => ({
      title: item.title ?? '',
      description: item.description ?? '',
    }));

    this.logger.log(`Fetched ${items.length} news items`);
    return items;
  }
}
