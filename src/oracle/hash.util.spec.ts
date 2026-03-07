import { buildTaskDataHash, stableStringify } from './hash.util';

describe('hash.util', () => {
  it('stableStringify sorts object keys recursively', () => {
    const a = { z: 1, nested: { b: 2, a: 1 } };
    const b = { nested: { a: 1, b: 2 }, z: 1 };

    expect(stableStringify(a)).toEqual(stableStringify(b));
  });

  it('buildTaskDataHash is deterministic for equivalent payloads', () => {
    const payloadA = {
      action: 'BUY',
      decision: { sentiment: 'POSITIVE', confidence: 0.82 },
      news: [
        { title: 'A', description: 'B' },
        { title: 'C', description: 'D' },
      ],
    };

    const payloadB = {
      news: [
        { description: 'B', title: 'A' },
        { description: 'D', title: 'C' },
      ],
      decision: { confidence: 0.82, sentiment: 'POSITIVE' },
      action: 'BUY',
    };

    expect(buildTaskDataHash(payloadA)).toEqual(buildTaskDataHash(payloadB));
  });
});
