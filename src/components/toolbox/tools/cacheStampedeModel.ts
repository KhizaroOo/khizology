export const cacheStrategies = ['No Protection', 'Request Coalescing', 'Stale-While-Revalidate', 'TTL Jitter', 'Combined Protection'] as const;
export type CacheStrategy = typeof cacheStrategies[number];
export interface CacheSettings {
    rps: number;
    duration: number;
    ttl: number;
    keys: number;
    hotPercent: number;
    burstPercent: number;
    originMs: number;
    healthy: number;
    staleWindow: number;
    jitterPercent: number;
    originLimit: number;
    seed: number;
    initial: 'warm' | 'cold';
    expiry: 'hot' | 'synchronized' | 'random';
}
export const CACHE_LIMITS = { requests: 20000, keys: 100, events: 100000, timeline: 41 };
export const cacheDefaults: CacheSettings = { rps: 400, duration: 15, ttl: 5, keys: 1, hotPercent: 100, burstPercent: 0, originMs: 400, healthy: 25, staleWindow: 3, jitterPercent: 30, originLimit: 10, seed: 42, initial: 'warm', expiry: 'hot' };
export const cachePresets: Record<string, CacheSettings> = {
    'Normal Traffic': { ...cacheDefaults, rps: 40, duration: 20, ttl: 60, keys: 20, hotPercent: 70, originMs: 80, expiry: 'synchronized' },
    'Hot Product': { ...cacheDefaults },
    'Viral Spike': { ...cacheDefaults, rps: 600, burstPercent: 70, originMs: 600, healthy: 20 },
    'Batch Expiry': { ...cacheDefaults, rps: 500, duration: 20, keys: 40, hotPercent: 0, expiry: 'synchronized' },
    'Slow Origin': { ...cacheDefaults, rps: 200, originMs: 2000, healthy: 20 },
    'Extreme Stampede': { ...cacheDefaults, rps: 1000, duration: 20, ttl: 4, keys: 50, hotPercent: 85, burstPercent: 60, originMs: 1500, healthy: 10 }
};
export const cacheRanges = [
    ['rps', 'Requests per second', 1, 2000], ['duration', 'Traffic duration (seconds)', 1, 60], ['ttl', 'TTL (seconds)', .5, 120],
    ['keys', 'Cache keys', 1, 100], ['hotPercent', 'Traffic to hottest key (%)', 0, 100], ['burstPercent', 'Traffic moved near expiry (%)', 0, 80],
    ['originMs', 'Base origin response (ms)', 1, 5000], ['healthy', 'Healthy origin concurrency', 1, 200],
    ['staleWindow', 'Allowed stale window (seconds)', 0, 60], ['jitterPercent', 'TTL jitter ± (%)', 0, 80], ['originLimit', 'Combined origin concurrency cap', 1, 200], ['seed', 'Seed', 0, 4294967295]
] as const;
export function validateCache(s: CacheSettings) {
    for (const [key, , min, max] of cacheRanges) {
        const v = s[key];
        if (!Number.isFinite(v) || v < min || v > max || !['ttl', 'duration', 'staleWindow'].includes(key) && !Number.isInteger(v))
            throw Error(`Use a valid ${key}: ${min}–${max}${['ttl', 'duration', 'staleWindow'].includes(key) ? '' : ' (whole number)'}.`);
    }
    if (Math.floor(s.rps * s.duration) > CACHE_LIMITS.requests)
        throw Error('Limit the traffic window to 20,000 requests: reduce rate or duration.');
    if (!['warm', 'cold'].includes(s.initial) || !['hot', 'synchronized', 'random'].includes(s.expiry))
        throw Error('Choose a supported initial state and expiry pattern.');
}
// Indexed draws preserve identical arrivals and key popularity across strategies.
function draw(seed: number, index: number, channel: number) { let x = (seed ^ Math.imul(index + 1, 2654435761) ^ Math.imul(channel + 1, 2246822519)) >>> 0; x ^= x >>> 16; x = Math.imul(x, 2246822507); x ^= x >>> 13; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
interface Job {
    key: number;
    generation: number;
    waitCount: number;
    arrivalSum: number;
    earliest: number;
}
interface Event {
    time: number;
    type: 0 | 1 | 2;
    seq: number;
    key: number;
    generation?: number;
    job?: Job;
}
export interface CacheBin {
    time: number;
    hits: number;
    misses: number;
    stale: number;
    starts: number;
    completed: number;
    refills: number;
    expirations: number;
    peak: number;
    queued: number;
}
export function simulateCache(s: CacheSettings, strategy: CacheStrategy) {
    validateCache(s);
    if (!cacheStrategies.includes(strategy))
        throw Error('Choose a supported strategy.');
    const total = Math.floor(s.rps * s.duration), horizon = s.duration * 1000, ttl = s.ttl * 1000, binMs = horizon / 40;
    const coalesce = strategy === 'Request Coalescing' || strategy === 'Stale-While-Revalidate' || strategy === 'Combined Protection';
    const swr = strategy === 'Stale-While-Revalidate' || strategy === 'Combined Protection';
    const jitter = (strategy === 'TTL Jitter' || strategy === 'Combined Protection') && s.keys > 1 && s.expiry !== 'hot';
    const limit = strategy === 'Combined Protection' ? s.originLimit : Infinity;
    const timeline: CacheBin[] = Array.from({ length: 41 }, (_, i) => ({ time: i < 40 ? i * binMs : horizon, hits: 0, misses: 0, stale: 0, starts: 0, completed: 0, refills: 0, expirations: 0, peak: 0, queued: 0 }));
    const bin = (t: number) => timeline[Math.min(40, Math.floor(t / binMs))];
    const heap: Event[] = [];
    let sequence = 0, processed = 0;
    const less = (a: Event, b: Event) => a.time < b.time || a.time === b.time && (a.type < b.type || a.type === b.type && a.seq < b.seq);
    function push(event: Omit<Event, 'seq'>) { const e = { ...event, seq: sequence++ }; heap.push(e); let i = heap.length - 1; while (i > 0) {
        const p = (i - 1) >> 1;
        if (!less(e, heap[p]))
            break;
        heap[i] = heap[p];
        i = p;
    } heap[i] = e; }
    function pop() { const first = heap[0], last = heap.pop()!; if (heap.length) {
        let i = 0;
        while (i * 2 + 1 < heap.length) {
            let c = i * 2 + 1;
            if (c + 1 < heap.length && less(heap[c + 1], heap[c]))
                c++;
            if (!less(heap[c], last))
                break;
            heap[i] = heap[c];
            i = c;
        }
        heap[i] = last;
    } return first; }
    const state = Array.from({ length: s.keys }, (_, key) => {
        let expiry = s.expiry === 'hot' ? (key === 0 ? ttl : horizon + ttl) : s.expiry === 'random' ? draw(s.seed, key, 4) * ttl * 2 : ttl;
        if (jitter)
            expiry *= 1 + (draw(s.seed, key, 5) * 2 - 1) * s.jitterPercent / 100;
        const k = { expiry: s.initial === 'warm' ? expiry : 0, hasValue: s.initial === 'warm', generation: 0, pending: undefined as Job | undefined, inflight: new Map<number, number>() };
        if (k.hasValue && expiry < horizon)
            push({ time: expiry, type: 1, key, generation: 0 });
        return k;
    });
    for (let i = 0; i < total; i++) {
        const hot = draw(s.seed, i, 0) * 100 < s.hotPercent;
        const key = s.keys === 1 ? 0 : hot ? 0 : 1 + Math.floor(draw(s.seed, i, 1) * (s.keys - 1));
        const center = Math.min(ttl, horizon * .8), time = draw(s.seed, i, 2) * 100 < s.burstPercent ? Math.min(horizon - .001, center + draw(s.seed, i, 3) * 100) : i / s.rps * 1000;
        push({ time, type: 2, key });
    }
    let hits = 0, misses = 0, stale = 0, origin = 0, duplicates = 0, active = 0, peak = 0, overload = 0, refreshes = 0, expirations = 0, waiting = 0, coalesced = 0, latencySum = 0, worst = 0, maxStaleness = 0, peakQueue = 0, finishAt = 0;
    const queue: Job[] = [];
    let queueIndex = 0, lastBucket = 0;
    function start(job: Job, t: number) {
        active++;
        origin++;
        peak = Math.max(peak, active);
        if (active > s.healthy)
            overload++;
        const duration = s.originMs * Math.max(1, active / s.healthy);
        const b = bin(t);
        b.starts++;
        b.peak = Math.max(b.peak, active);
        push({ time: t + duration, type: 0, key: job.key, job });
    }
    while (heap.length) {
        if (++processed > CACHE_LIMITS.events)
            throw Error('Simulation event safety limit reached. Reduce the scenario.');
        const e = pop(), k = state[e.key], b = bin(e.time);
        const target = Math.min(40, Math.floor(e.time / binMs));
        while (lastBucket < target) {
            const carried = timeline[++lastBucket];
            carried.peak = Math.max(carried.peak, active);
            carried.queued = Math.max(carried.queued, queue.length - queueIndex);
        }
        b.peak = Math.max(b.peak, active);
        b.queued = Math.max(b.queued, queue.length - queueIndex);
        if (e.type === 1) {
            if (k.generation === e.generation && k.hasValue && k.expiry === e.time) {
                expirations++;
                b.expirations++;
            }
            continue;
        }
        if (e.type === 0) {
            const job = e.job!;
            active--;
            finishAt = Math.max(finishAt, e.time);
            b.completed++;
            if (job.waitCount) {
                latencySum += job.waitCount * e.time - job.arrivalSum;
                worst = Math.max(worst, e.time - job.earliest);
            }
            k.inflight.set(job.generation, Math.max(0, (k.inflight.get(job.generation) ?? 1) - 1));
            if (k.pending === job)
                k.pending = undefined;
            // First completion refills this generation; late duplicates cannot extend TTL or overwrite it.
            if (job.generation === k.generation) {
                k.hasValue = true;
                k.generation++;
                refreshes++;
                b.refills++;
                let lifetime = ttl;
                if (jitter)
                    lifetime *= 1 + (draw(s.seed, e.key + k.generation * 101, 6) * 2 - 1) * s.jitterPercent / 100;
                k.expiry = e.time + lifetime;
                if (k.expiry < horizon)
                    push({ time: k.expiry, type: 1, key: e.key, generation: k.generation });
            }
            while (queueIndex < queue.length && active < limit)
                start(queue[queueIndex++], e.time);
            continue;
        }
        if (k.hasValue && e.time < k.expiry) {
            hits++;
            b.hits++;
            latencySum += 1;
            worst = Math.max(worst, 1);
            continue;
        }
        misses++;
        b.misses++;
        const serveStale = swr && k.hasValue && e.time - k.expiry < s.staleWindow * 1000;
        if (serveStale) {
            stale++;
            b.stale++;
            latencySum += 1;
            worst = Math.max(worst, 1);
            maxStaleness = Math.max(maxStaleness, e.time - k.expiry);
        }
        else
            waiting++;
        if (coalesce && k.pending) {
            if (!serveStale) {
                k.pending.waitCount++;
                k.pending.arrivalSum += e.time;
                k.pending.earliest = Math.min(k.pending.earliest, e.time);
                coalesced++;
            }
            continue;
        }
        if ((k.inflight.get(k.generation) ?? 0) > 0)
            duplicates++;
        k.inflight.set(k.generation, (k.inflight.get(k.generation) ?? 0) + 1);
        const job: Job = { key: e.key, generation: k.generation, waitCount: serveStale ? 0 : 1, arrivalSum: serveStale ? 0 : e.time, earliest: serveStale ? Infinity : e.time };
        if (coalesce)
            k.pending = job;
        if (active < limit)
            start(job, e.time);
        else {
            queue.push(job);
            peakQueue = Math.max(peakQueue, queue.length - queueIndex);
            b.queued = Math.max(b.queued, queue.length - queueIndex);
        }
    }
    return { strategy, total, hits, misses, stale, origin, duplicates, peak, overload, refreshes, expirations, waiting, coalesced, averageLatency: latencySum / total, worstLatency: worst, maxStaleness, hitRate: hits / total * 100, stalePercent: stale / total * 100, peakQueue, peakExpiry: Math.max(...timeline.map(b => b.expirations)), timeline, binMs, finishAt, processed, jitterApplied: jitter };
}
export function compareCache(s: CacheSettings) { return cacheStrategies.map(strategy => simulateCache(s, strategy)); }
