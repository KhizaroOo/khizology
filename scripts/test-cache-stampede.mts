import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cacheDefaults, cachePresets, cacheStrategies, simulateCache, compareCache, CACHE_LIMITS } from '../src/components/toolbox/tools/cacheStampedeModel.ts';
const normal = simulateCache(cachePresets['Normal Traffic'], 'No Protection');
assert.equal(normal.hitRate, 100);
assert.equal(normal.origin, 0);
assert.equal(normal.overload, 0);
const hot = compareCache(cacheDefaults), base = hot[0], coal = hot[1], swr = hot[2], jit = hot[3], combined = hot[4];
assert.ok(base.duplicates > 100 && base.peak > cacheDefaults.healthy && base.overload > 0);
assert.ok(coal.origin < base.origin / 10);
assert.equal(coal.duplicates, 0);
assert.ok(coal.coalesced > 0);
assert.equal(coal.peak, 1);
assert.ok(swr.stale > 0);
assert.ok(swr.averageLatency < coal.averageLatency);
assert.ok(swr.maxStaleness <= cacheDefaults.staleWindow * 1000);
assert.equal(swr.duplicates, 0);
assert.equal(jit.origin, base.origin);
assert.equal(jit.peak, base.peak);
assert.equal(jit.jitterApplied, false);
assert.deepEqual(jit.timeline, base.timeline);
const batch = compareCache(cachePresets['Batch Expiry']);
assert.ok(batch[3].peakExpiry < batch[0].peakExpiry);
assert.ok(batch[3].peak < batch[0].peak);
assert.ok(batch[4].peak <= cacheDefaults.originLimit);
assert.ok(batch[4].peakQueue > 0);
assert.equal(batch[4].overload, 0);
const slow = simulateCache({ ...cacheDefaults, originMs: 2000 }, 'No Protection');
assert.ok(slow.duplicates > base.duplicates);
assert.ok(slow.averageLatency > base.averageLatency);
assert.equal(combined.overload, 0);
assert.ok(combined.stale > 0);
for (const strategy of cacheStrategies) {
    const cold = simulateCache({ ...cacheDefaults, initial: 'cold', duration: 1 }, strategy);
    assert.equal(cold.stale, 0);
    assert.ok(cold.origin > 0);
}
const noStale = simulateCache({ ...cacheDefaults, staleWindow: 0 }, 'Stale-While-Revalidate');
assert.equal(noStale.stale, 0);
assert.equal(noStale.averageLatency, coal.averageLatency);
assert.deepEqual(compareCache(cachePresets['Batch Expiry']), batch);
assert.notDeepEqual(simulateCache({ ...cachePresets['Batch Expiry'], seed: 43 }, 'TTL Jitter').timeline, batch[3].timeline);
const initial = JSON.stringify(cacheDefaults);
compareCache(cacheDefaults);
assert.equal(JSON.stringify(cacheDefaults), initial);
for (const settings of Object.values(cachePresets)) {
    for (const r of compareCache(settings)) {
        assert.equal(r.hits + r.misses, r.total);
        for(const key of ['hits','misses','stale'] as const)assert.equal(r.timeline.reduce((sum,b)=>sum+b[key],0),r[key]);
        assert.equal(r.timeline.reduce((sum,b)=>sum+b.starts,0),r.origin);
        assert.equal(r.timeline.reduce((sum,b)=>sum+b.refills,0),r.refreshes);
        assert.equal(Math.max(...r.timeline.map(b=>b.peak)),r.peak);
        assert.equal(r.waiting + r.stale, r.misses);
        assert.equal(r.refreshes + r.duplicates, r.origin);
        assert.ok(r.stale <= r.misses);
        assert.ok(r.origin <= r.misses);
        assert.ok(r.averageLatency <= r.worstLatency + .0001);
        assert.ok(r.processed <= CACHE_LIMITS.events);
        assert.ok(r.timeline.length <= CACHE_LIMITS.timeline);
        for (const [key, value] of Object.entries(r))
            if (typeof value === 'number')
                assert.ok(Number.isFinite(value) && value >= 0, `${r.strategy} ${key} is finite/nonnegative`);
    }
}
for (const value of [NaN, Infinity, -1, 2001])
    assert.throws(() => simulateCache({ ...cacheDefaults, rps: value }, 'No Protection'));
assert.throws(() => simulateCache({ ...cacheDefaults, rps: 2000, duration: 60 }, 'No Protection'), /20,000/);
assert.throws(() => simulateCache({ ...cacheDefaults, keys: 101 }, 'No Protection'));
assert.throws(() => simulateCache({ ...cacheDefaults, originLimit: 0 }, 'Combined Protection'));
assert.throws(() => simulateCache({ ...cacheDefaults, expiry: 'bad' as any }, 'No Protection'));
const start = performance.now();
const extreme = compareCache({ ...cachePresets['Extreme Stampede'], keys: 100, healthy: 1, originLimit: 1, originMs: 5000 });
assert.ok(extreme.every(r => Number.isFinite(r.averageLatency)));
assert.ok(performance.now() - start < 5000, 'Bounded extreme model must complete promptly');
const component = fs.readFileSync('src/components/toolbox/tools/CacheStampedeSimulator.tsx', 'utf8');
const model = fs.readFileSync('src/components/toolbox/tools/cacheStampedeModel.ts', 'utf8');
assert.equal((component.match(/trackToolResult\(\)/g) ?? []).length, 1);
assert.ok(!/localStorage|sessionStorage|URLSearchParams|fetch\(|sendBeacon|setInterval|requestAnimationFrame/.test(component + model));
console.log('Cache stampede PASS: six presets, all strategies, conservation, expiry, coalescing, SWR/cold boundaries, jitter truth, concurrency caps, deterministic draws, extreme limits and local-only analytics.');

const randomSettings={...cachePresets['Batch Expiry'],expiry:'random' as const};assert.deepEqual(compareCache(randomSettings),compareCache(randomSettings));assert.ok(simulateCache(randomSettings,'No Protection').peakExpiry<batch[0].peakExpiry);
