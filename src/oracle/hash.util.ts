import { keccak256, toUtf8Bytes } from 'ethers';

function normalizeForStableJson(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForStableJson(item));
  }

  if (typeof value === 'object') {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => [key, normalizeForStableJson(entryValue)]);

    return Object.fromEntries(sortedEntries);
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeForStableJson(value));
}

export function buildTaskDataHash(value: unknown): string {
  return keccak256(toUtf8Bytes(stableStringify(value)));
}
