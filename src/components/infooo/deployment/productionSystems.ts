import { advanceDeployment, startDeployment } from './deploymentJourney.ts';

export type Strategy = 'recreate' | 'rolling' | 'blue-green' | 'canary';
export interface RolloutFrame { instances: string[]; v2Traffic: number; available: boolean; note: string; }
export const strategyLabels: Record<Strategy, string> = { recreate: 'Recreate', rolling: 'Rolling', 'blue-green': 'Blue / Green', canary: 'Canary' };
const frame = (instances: string[], v2Traffic: number, available: boolean, note: string): RolloutFrame => ({ instances, v2Traffic, available, note });
const original = frame(['v1', 'v1', 'v1'], 0, true, 'Version 1 serves all traffic.');
export const strategyFrames: Record<Strategy, RolloutFrame[]> = {
  recreate: [original, frame([], 0, false, 'Stop v1 first: users experience downtime.'), frame(['v2 ready', 'v2 ready', 'v2 ready'], 0, false, 'Start and check v2 before admitting requests.'), frame(['v2', 'v2', 'v2'], 100, true, 'Version 2 now serves requests.')],
  rolling: [original, frame(['v1', 'v1', 'v2'], 33, true, 'Replace one instance after its readiness check.'), frame(['v1', 'v2', 'v2'], 67, true, 'Two new instances serve alongside one old instance.'), frame(['v2', 'v2', 'v2'], 100, true, 'The last old instance is replaced. Mixed versions must be compatible.')],
  'blue-green': [original, frame(['blue v1', 'blue v1', 'blue v1', 'green v2 ready', 'green v2 ready', 'green v2 ready'], 0, true, 'Prepare green separately while blue serves. This needs extra capacity.'), frame(['blue v1 retained', 'green v2', 'green v2', 'green v2'], 100, true, 'Switch the traffic entry point to green; retain blue briefly for reversal.'), frame(['green v2', 'green v2', 'green v2'], 100, true, 'After the observation window, retire blue.')],
  canary: [original, frame(['v1', 'v1', 'v2 canary'], 10, true, 'Send a small sample to v2. Traffic weight is not the instance count.'), frame(['v1', 'v2', 'v2'], 50, true, 'Expand only if the measured release behavior is acceptable.'), frame(['v2', 'v2', 'v2'], 100, true, 'Promote v2 after checking the progressive rollout.')],
};
export interface RolloutState { strategy: Strategy; step: number; status: 'ready' | 'running' | 'failed' | 'complete' | 'rolled-back'; }
export function rolloutStart(strategy: Strategy): RolloutState { return { strategy, step: 0, status: 'running' }; }
export function rolloutNext(state: RolloutState, fail = false): RolloutState {
  if (state.status !== 'running') return state;
  const step = Math.min(state.step + 1, strategyFrames[state.strategy].length - 1);
  return { ...state, step, status: fail ? 'failed' : step === strategyFrames[state.strategy].length - 1 ? 'complete' : 'running' };
}
export function rolloutBack(state: RolloutState): RolloutState { return { ...state, step: 0, status: 'rolled-back' }; }

export const environmentFields = ['Configuration', 'Environment variables', 'Secrets', 'Domain', 'Database', 'Logging', 'Scale', 'Deployment gate'] as const;
export const environments = {
  Local: ['Developer defaults', 'APP_ENV=local', 'Separate demo credentials', 'localhost', 'Disposable local data', 'Detailed console output', 'One developer process', 'Local checks'],
  Development: ['Shared integration settings', 'APP_ENV=development', 'Non-production credentials', 'dev.example.invalid', 'Isolated test data', 'Shared debug logs', 'Small shared service', 'CI checks'],
  Staging: ['Production-like settings', 'APP_ENV=staging', 'Separate staging credentials', 'staging.example.invalid', 'Sanitized representative data', 'Production-like telemetry', 'Often smaller than production', 'Integration / acceptance checks'],
  Production: ['Release settings', 'APP_ENV=production', 'Runtime injection; restricted access', 'app.example.invalid', 'Live data; backups and access controls', 'Privacy-aware logs and alerts', 'Capacity for actual demand', 'Readiness + rollout approval'],
} as const;
export type Environment = keyof typeof environments;
export function trafficModel(users: number, balance: boolean, multiple: boolean, autoscale: boolean, slowDb = false) {
  const requested = Math.max(100, Math.min(10000, users));
  const provisioned = autoscale ? Math.min(8, Math.max(1, Math.ceil(requested / 1500))) : multiple ? 3 : 1;
  const active = balance ? provisioned : 1;
  const perInstance = requested / active;
  const pressure = perInstance / 2000;
  const dbMs = slowDb ? 900 : 20;
  const latency = Math.round(60 + dbMs + 40 * pressure + 250 * Math.max(0, pressure - 1));
  const errors = Math.round(Math.min(85, Math.max(0, (pressure - 1) / pressure * 100)));
  return { users: requested, provisioned, active, perInstance: Math.round(perInstance), pressure, latency, errors, dbMs };
}
export function telemetry(slow: boolean, users = 100, balance = false, multiple = false, autoscale = false) {
  const load = trafficModel(users, balance, multiple, autoscale, slow);
  return { ...load, spans: [{ label: 'Proxy', ms: 10 }, { label: 'Application', ms: 35 }, { label: 'Database', ms: load.dbMs }, { label: 'Response', ms: load.latency - 45 - load.dbMs }], log: slow ? 'demo-request: database query took 900 ms; connection remained open' : 'demo-request: database query completed in 20 ms', health: 'Readiness probe passes; this does not guarantee a fast request.' };
}

export type Migration = 'safe' | 'missing' | 'destructive';
export const migrationFrames: Record<Migration, Array<{ app: string; schema: string; good: boolean; note: string }>> = {
  safe: [
    { app: 'v1', schema: 'v1: name', good: true, note: 'The current app reads the existing name column.' },
    { app: 'v1', schema: 'v2: name + display_name', good: true, note: 'Expand: add a compatible column and backfill existing rows. Keep the old column.' },
    { app: 'v2', schema: 'v2: name + display_name', good: true, note: 'Deploy code that uses the new field with compatible reads and writes.' },
    { app: 'v2', schema: 'v2: display_name', good: true, note: 'Contract only after old code and rollback dependencies are retired. App v1 can no longer safely return.' },
  ],
  missing: [
    { app: 'v1', schema: 'v1: name', good: true, note: 'Version 1 works with the old schema.' },
    { app: 'v2', schema: 'v1: name', good: false, note: 'Runtime error: v2 expects display_name, but no migration added it.' },
  ],
  destructive: [
    { app: 'v1', schema: 'v1: name', good: true, note: 'Version 1 still reads name.' },
    { app: 'v1', schema: 'v2: display_name only', good: false, note: 'Dropping name first breaks the old app, including an application-only rollback.' },
  ],
};
export type CacheMode = 'off' | 'hit' | 'miss' | 'expired';
export function cacheJourney(mode: CacheMode): { labels: string[]; descriptions: string[] } {
  const labels = mode === 'hit' ? ['Browser', 'DNS', 'HTTPS / TLS', 'CDN', 'Cached asset', 'Response', 'Browser renders'] : ['Browser', 'DNS', 'HTTPS / TLS', ...(mode === 'off' ? [] : ['CDN cache miss']), 'Reverse proxy', 'Application', 'Optional database', 'Response', 'Browser renders'];
  return { labels, descriptions: labels.map(label => label === 'CDN cache miss' ? mode === 'expired' ? 'TTL expired in this simplified model. Fetch a fresh cacheable asset from the origin; real caches may revalidate.' : 'No usable cached copy: ask the origin and store a cacheable response.' : label === 'Cached asset' ? 'A fresh, public static asset is served at the edge. The application is bypassed for this hit.' : label === 'Optional database' ? 'Dynamic requests may read data; the static asset in this example skips the database.' : label === 'Browser renders' ? 'The response reaches the browser. Private responses must not be blindly cached.' : `The request passes through ${label}. DNS answers and connections may be reused.`) };
}

export interface QueueState { waiting: number; done: number; worker: boolean; last: string; }
export const initialQueue: QueueState = { waiting: 0, done: 0, worker: true, last: 'No demo jobs queued.' };
export function queueEvent(state: QueueState, event: 'upload' | 'tick' | 'crash' | 'resume'): QueueState {
  if (event === 'upload') return { ...state, waiting: state.waiting + 1, last: 'Demo image accepted → queued. Browser receives a job ID, not a finished image.' };
  if (event === 'crash') return { ...state, worker: false, last: 'Worker unavailable. Queued jobs wait; a queue does not process work by itself.' };
  if (event === 'resume') return { ...state, worker: true, last: 'Replacement worker ready. Pending jobs can resume.' };
  if (!state.worker || !state.waiting) return state;
  return { ...state, waiting: state.waiting - 1, done: state.done + 1, last: 'Queue → worker → processing → storage → result. One job acknowledged.' };
}
export type ConfigFault = 'none' | 'missing' | 'committed';
export function configResult(fault: ConfigFault) {
  return fault === 'missing' ? { good: false, message: 'Startup blocked: required API_KEY is absent. Supply it through the runtime secret mechanism.' } : fault === 'committed' ? { good: false, message: 'Unsafe: a secret was committed to source. Remove it, rotate the credential and review exposure; deleting a file does not erase Git history.' } : { good: true, message: 'Configuration references supplied at runtime. No secret values are displayed or accepted.' };
}
export const artifactVersions = {
  v1: { commit: 'a1b2c3d', build: 'demo-build-101', artifact: 'demo-app:v1', digest: 'DEMO-DIGEST-A', deployment: 'demo-release-1' },
  v2: { commit: 'd4e5f6a', build: 'demo-build-102', artifact: 'demo-app:v2', digest: 'DEMO-DIGEST-B', deployment: 'demo-release-2' },
} as const;
export const challenges = [
  { id: 'build', title: 'No artifact', clues: ['Dependencies ✓', 'Compile ✕: unexpected token', 'Artifact absent'], choices: ['Fix source syntax', 'Change DNS', 'Add replicas'], answer: 0, repair: 'build', lesson: 'Fix the source error, rebuild and verify the new artifact.' },
  { id: 'env', title: 'Candidate crashes', clues: ['Build ✓', 'API_KEY absent', 'Process exits at startup'], choices: ['Disable HTTPS', 'Inject the required runtime secret', 'Change the domain'], answer: 1, repair: 'env', lesson: 'Supply the required configuration safely before starting the process.' },
  { id: 'port', title: 'Gateway cannot reach app', clues: ['Build ✓ · tests ✓', 'App listens on 8080', 'Proxy targets 3000 · health ✕'], choices: ['DNS', 'Port mapping', 'Database', 'TLS'], answer: 1, repair: 'port', lesson: 'Point the proxy and health probe at the actual listener.' },
  { id: 'health', title: 'Wrong readiness probe', clues: ['App serves /ready with 200', 'Probe requests /missing', 'Readiness ✕: 404'], choices: ['Ignore readiness', 'Delete tests', 'Use the correct readiness endpoint'], answer: 2, repair: 'health', lesson: 'A probe must test the right endpoint; do not bypass a failing gate.' },
  { id: 'dns', title: 'Wrong destination', clues: ['App ready ✓', 'Domain points to the previous server', 'Users reach another service'], choices: ['Correct the DNS record', 'Recompile the app', 'Add a database'], answer: 0, repair: 'dns', lesson: 'Correct the destination and allow for cached DNS answers.' },
  { id: 'migration', title: 'New field is missing', clues: ['v2 reads display_name', 'Schema v1 has only name', 'Request fails'], choices: ['Change TLS', 'Apply compatible schema expansion first', 'Delete the old field first'], answer: 1, repair: 'migration', lesson: 'Expand the schema compatibly before code requires the new field.' },
  { id: 'worker', title: 'Accepted but unfinished', clues: ['HTTP accepted ✓', 'Queue: 3 waiting', 'Worker unavailable'], choices: ['Change the domain', 'Drop waiting jobs', 'Restore the worker'], answer: 2, repair: 'worker', lesson: 'Restore processing capacity. Accepted work is not completed work.' },
] as const;
export const finaleFrames = [
  { title: 'V1 running', v2: 0, users: 100, slow: false, note: 'Healthy baseline. Record the existing request behavior.' },
  { title: 'Traffic spike', v2: 0, users: 10000, slow: false, note: 'Demand rises. In this toy model a load balancer and extra instances spread traffic.' },
  { title: 'V2 canary: 10%', v2: 10, users: 10000, slow: true, note: 'A small v2 cohort reaches a slower database query path.' },
  { title: 'Observe regression', v2: 10, users: 10000, slow: true, note: 'Compare cohorts: v2 latency rises while v1 remains faster. A passing readiness probe is insufficient.' },
  { title: 'Stop promotion', v2: 10, users: 10000, slow: true, note: 'The demo release gate holds traffic weight at 10%; do not increase exposure.' },
  { title: 'Return traffic to V1', v2: 0, users: 10000, slow: false, note: 'Route all requests back to retained v1. No database schema changed in this scenario.' },
  { title: 'System stabilizes', v2: 0, users: 10000, slow: false, note: 'Extra instances remain for demand; the slow v2 code path is removed. Keep observing before retrying.' },
] as const;

export function replayChallenge(index: number, answer: number | null) {
  const challenge = challenges[index];
  if (!challenge || challenge.answer !== answer) return { good: false, stages: ['Repair not verified'] };
  if (challenge.repair === 'migration') return { good: migrationFrames.safe[2].good, stages: ['Expand schema ✓', 'Deploy v2 ✓', 'Compatible request ✓'] };
  if (challenge.repair === 'worker') {
    const queued = queueEvent(queueEvent(initialQueue, 'crash'), 'upload');
    const repaired = queueEvent(queueEvent(queued, 'resume'), 'tick');
    return { good: repaired.done === 1 && repaired.waiting === 0, stages: ['Restore worker ✓', 'Process queued job ✓', 'Store result ✓'] };
  }
  let state = startDeployment('none');
  while (state.status === 'running') state = advanceDeployment(state);
  return { good: state.status === 'live', stages: ['Build ✓', 'Configuration ✓', 'Runtime ✓', 'Reachable + ready ✓', 'LIVE ✓'] };
}
