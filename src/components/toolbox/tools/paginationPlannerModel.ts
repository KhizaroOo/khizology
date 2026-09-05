export interface PaginationInputs {
  records: number;
  recordBytes: number;
  pageSize: number;
  requestsPerMinute: number;
  deepPagePercent: number;
  deepRequestPercent: number;
  pattern: 'admin' | 'feed' | 'export';
  updates: 'rare' | 'frequent' | 'continuous';
  stableOrder: boolean;
  jumping: boolean;
  sequential: boolean;
  cursorBacking: 'keyset' | 'offset';
}

export function planPagination(input: PaginationInputs) {
  const pages = Math.ceil(input.records / input.pageSize);
  const deepPage = Math.max(1, Math.ceil(pages * input.deepPagePercent / 100));
  const skipped = Math.min(input.records, (deepPage - 1) * input.pageSize);
  const returned = Math.min(input.pageSize, input.records - skipped);
  const payload = Math.min(input.pageSize, input.records) * input.recordBytes;
  const patternRange = input.pattern === 'feed' ? [20, 50] : input.pattern === 'admin' ? [25, 100] : [100, 1000];
  const payloadBudget = input.pattern === 'export' ? 1024 * 1024 : 256 * 1024;
  const affordable = Math.max(1, Math.floor(payloadBudget / input.recordBytes));
  const high = Math.min(patternRange[1], affordable, input.records);
  const low = Math.min(patternRange[0], high);
  const recommendation = !input.stableOrder ? 'Define a deterministic sort first'
    : input.jumping ? 'Investigate offset pagination first'
      : input.pattern === 'feed' || input.updates !== 'rare' ? 'Investigate opaque cursors backed by keyset queries'
        : input.pattern === 'export' || input.sequential ? 'Investigate keyset queries first'
          : 'Start with offset and profile representative pages';
  const averageOffsetRows = (1 - input.deepRequestPercent / 100) * Math.min(input.pageSize, input.records) + input.deepRequestPercent / 100 * (skipped + returned);
  return { pages, deepPage, skipped, returned, payload, offsetRows: skipped + returned, keysetRows: returned, averageOffsetRows, low, high, payloadBudget, recommendation, perMinuteBytes: payload * input.requestsPerMinute };
}
