import { NewsSentimentStrategy } from './news-sentiment.strategy';
import { OracleExecutionError } from '../core/oracle-execution.error';

describe('NewsSentimentStrategy', () => {
  let strategy: NewsSentimentStrategy;

  beforeEach(() => {
    strategy = new NewsSentimentStrategy();
  });

  describe('parseResponse', () => {
    it('parses a valid POSITIVE response', () => {
      const raw = '{"sentiment":"POSITIVE","confidence":0.82}';
      const result = strategy.parseResponse(raw);
      expect(result.sentiment).toBe('POSITIVE');
      expect(result.confidence).toBe(0.82);
    });

    it('parses a valid NEGATIVE response', () => {
      const raw = '{"sentiment":"NEGATIVE","confidence":0.65}';
      const result = strategy.parseResponse(raw);
      expect(result.sentiment).toBe('NEGATIVE');
    });

    it('parses a valid NEUTRAL response', () => {
      const raw = '{"sentiment":"NEUTRAL","confidence":0.5}';
      const result = strategy.parseResponse(raw);
      expect(result.sentiment).toBe('NEUTRAL');
    });

    it('extracts JSON from a response with surrounding text', () => {
      const raw =
        'Here is the result: {"sentiment":"POSITIVE","confidence":0.9} done.';
      const result = strategy.parseResponse(raw);
      expect(result.sentiment).toBe('POSITIVE');
    });

    it('throws OracleExecutionError for malformed JSON', () => {
      expect(() => strategy.parseResponse('not json at all')).toThrow(
        OracleExecutionError,
      );
    });

    it('throws OracleExecutionError for invalid sentiment value', () => {
      const raw = '{"sentiment":"UNKNOWN","confidence":0.5}';
      expect(() => strategy.parseResponse(raw)).toThrow(OracleExecutionError);
    });

    it('throws OracleExecutionError when confidence is missing', () => {
      const raw = '{"sentiment":"POSITIVE"}';
      expect(() => strategy.parseResponse(raw)).toThrow(OracleExecutionError);
    });
  });

  describe('mapToTransaction', () => {
    it('maps POSITIVE to BUY', () => {
      const action = strategy.mapToTransaction({
        sentiment: 'POSITIVE',
        confidence: 0.9,
      });
      expect(action.type).toBe('BUY');
    });

    it('maps NEGATIVE to SELL', () => {
      const action = strategy.mapToTransaction({
        sentiment: 'NEGATIVE',
        confidence: 0.7,
      });
      expect(action.type).toBe('SELL');
    });

    it('maps NEUTRAL to NO_ACTION', () => {
      const action = strategy.mapToTransaction({
        sentiment: 'NEUTRAL',
        confidence: 0.5,
      });
      expect(action.type).toBe('NO_ACTION');
    });
  });
});
