import fs from 'node:fs';
import path from 'node:path';

const directory = process.argv[2] || '.performance';
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const metrics = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'];
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
function snapshot(report) {
  return {
    scores: Object.fromEntries(Object.entries(report.categories).map(([key, value]) => [key, Math.round(value.score * 100)])),
    metrics: Object.fromEntries(metrics.map(key => [key, report.audits[key].numericValue])),
    bytes: Object.fromEntries(report.audits['resource-summary'].details.items.map(item => [item.resourceType, item.transferSize])),
  };
}
const result = { date: '2026-09-09', origin: 'http://127.0.0.1:4322', measurement: 'Lighthouse local production preview; default simulated throttling; fresh browser per run; no analytics consent', devices: {} };
for (const device of ['desktop', 'mobile']) {
  const baseline = read(`lighthouse-before-${device}.json`);
  const reports = [1, 2, 3].map(run => read(`final-${device}-${run}.json`));
  const runs = reports.map(snapshot);
  const after = Object.fromEntries(['scores', 'metrics', 'bytes'].map(group => [group, Object.fromEntries(Object.keys(runs[0][group]).map(key => [key, median(runs.map(run => run[group][key]))]))]));
  const before = snapshot(baseline);
  result.devices[device] = {
    lighthouseVersion: baseline.lighthouseVersion, before, after, runs,
    reduction: Object.fromEntries(['total', 'image'].map(key => [key, { bytes: before.bytes[key] - after.bytes[key], percent: 100 * (1 - after.bytes[key] / before.bytes[key]) }])),
    baselineLcp: baseline.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.selector,
    largestBaselineRequests: baseline.audits['network-requests'].details.items.sort((a, b) => b.transferSize - a.transferSize).slice(0, 10).map(({ url, transferSize }) => ({ url, transferSize })),
    baselineBlocking: baseline.audits['render-blocking-insight']?.details?.items,
    baselineDom: baseline.audits['dom-size-insight']?.details?.debugData,
    forcedReflowScore: baseline.audits['forced-reflow-insight']?.score,
    remaining: Object.entries(reports[1].audits).filter(([key, value]) => key.endsWith('-insight') && value.score !== null && value.score < 1).map(([key, value]) => ({ key, description: value.displayValue })),
  };
}
result.lightTheme = snapshot(read('final-light.json'));
fs.writeFileSync('docs/PERFORMANCE-RESULTS.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(result.devices).map(([key, value]) => [key, { after: value.after, reduction: value.reduction }])), null, 2));
