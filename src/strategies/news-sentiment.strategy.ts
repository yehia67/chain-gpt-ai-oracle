import { NewsItem } from '../news/news.service';
import {
  AIOracleStrategy,
  OracleAction,
  OracleDecision,
} from './oracle-strategy.interface';
import { OracleExecutionError } from '../core/oracle-execution.error';

export class NewsSentimentStrategy implements AIOracleStrategy<NewsItem[]> {
  buildPrompt(input: NewsItem[]): string {
    const newsLines = input
      .map(
        (item, i) =>
          `${i + 1}. Title: ${item.title}\n   Summary: ${item.description}`,
      )
      .join('\n');

    return `You are a crypto sentiment classifier.

Evaluate the overall sentiment for ETH based on the following news.

Return ONLY valid JSON with no extra text, no markdown, no code blocks:

{"sentiment":"POSITIVE"|"NEGATIVE"|"NEUTRAL","confidence":number}

News:
${newsLines}`;
  }

  parseResponse(raw: string): OracleDecision {
    let parsed: unknown;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err: unknown) {
      throw new OracleExecutionError(
        `Failed to parse LLM response as JSON. Raw: ${raw}`,
        err,
      );
    }

    const obj = parsed as Record<string, unknown>;

    if (
      typeof obj.sentiment !== 'string' ||
      !['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(obj.sentiment) ||
      typeof obj.confidence !== 'number'
    ) {
      throw new OracleExecutionError(
        `Invalid decision schema. Parsed: ${JSON.stringify(obj)}`,
      );
    }

    return {
      sentiment: obj.sentiment as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
      confidence: obj.confidence,
    };
  }

  mapToTransaction(decision: OracleDecision): OracleAction {
    switch (decision.sentiment) {
      case 'POSITIVE':
        return { type: 'BUY' };
      case 'NEGATIVE':
        return { type: 'SELL' };
      case 'NEUTRAL':
        return { type: 'NO_ACTION' };
    }
  }
}
