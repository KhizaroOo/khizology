import type { InfoooEntity, InfoooGuide } from '../../../data/infooo';

export const lanes = ['Code', 'Build', 'Deploy', 'Serve', 'User'] as const;
export interface DeploymentStage extends InfoooEntity {
  lane: number; level: number; symbol: string; input: string; output: string; failure: string;
}
const stage = (id: string, title: string, lane: number, level: number, symbol: string, whatIs: string, whyItMatters: string, input: string, output: string, failure: string): DeploymentStage => ({ id, title, lane, level, symbol, input, output, failure, knowledge: { whatIs, whyItMatters } });
export const deploymentStages: DeploymentStage[] = [
  stage('developer', 'Developer', 0, 2, '✎', 'A person changes an application.', 'Software starts with a change someone intends to make.', 'An idea or a bug', 'An edited working copy', 'A change can solve the wrong problem.'),
  stage('code', 'Local code', 0, 1, '</>', 'Files edited on the developer’s computer.', 'The working copy lets you try changes before releasing them.', 'Edits', 'Source code', 'Code can work locally but fail in another environment.'),
  stage('commit', 'Git commit', 0, 2, '●', 'A recorded snapshot of tracked changes.', 'A commit gives the release a traceable identity.', 'Selected changes', 'A local commit', 'Uncommitted files are not part of the pushed commit.'),
  stage('push', 'Git push', 0, 2, '↑', 'Send local commits to a remote repository.', 'The deployment system needs access to the new source.', 'Local commits', 'Updated remote branch', 'Authentication or a rejected branch update can block the push.'),
  stage('repository', 'Git repository', 0, 2, '⑂', 'The shared source history used for this release.', 'The pipeline checks out a specific commit, not whatever is on your laptop.', 'Pushed commit', 'Versioned source snapshot', 'The wrong branch can deploy the wrong version.'),
  stage('trigger', 'CI trigger', 1, 2, '↗', 'An event starts an automated workflow.', 'A push can start the same repeatable checks each time.', 'Push event', 'Queued build job', 'Branch rules or permissions can prevent a run. Manual triggers are also possible.'),
  stage('build', 'Build starts', 1, 1, '⚙', 'A clean build workspace prepares the application.', 'Production needs a repeatable way to prepare runnable code.', 'Source snapshot', 'Build workspace', 'A missing build tool or an incompatible runtime can stop preparation.'),
  stage('dependencies', 'Dependencies', 1, 2, '+', 'Install the libraries the application needs.', 'Source code may rely on code from other packages.', 'Package manifest and lockfile', 'Installed libraries', 'Unavailable or incompatible dependencies can stop the build.'),
  stage('tests', 'Tests', 1, 2, '✓', 'Run automated checks before packaging the release.', 'This model requires passing checks before deployment. Passing tests cannot prove every behavior.', 'Source and dependencies', 'Pass or fail result', 'A failed assertion stops this CI gate.'),
  stage('compile', 'Compile / assemble', 1, 2, '{}', 'Transform or assemble source for production.', 'Some apps need compilation; others package interpreted code or static files.', 'Checked source and dependencies', 'Production output', 'A syntax or compile error means no new artifact is produced.'),
  stage('artifact', 'Artifact / image', 1, 1, '▣', 'A versioned package that production can run or serve.', 'The same built output should move from verification to release.', 'Production output', 'Release v2 package', 'Packaging can omit files. A container image is one artifact format, not a requirement.'),
  stage('registry', 'Artifact storage', 2, 3, '≡', 'Store the image or release package for retrieval.', 'Servers can fetch a known version and keep an earlier version for rollback.', 'Versioned artifact', 'Retrievable image or package', 'Permissions or an unavailable registry can block upload or download.'),
  stage('server', 'Production server', 2, 1, '▤', 'The machine or managed platform that hosts the app.', 'Production needs resources outside the developer’s laptop.', 'Release package', 'Candidate deployment', 'Capacity or platform availability can prevent deployment. Hosts may be VMs or managed services.'),
  stage('environment', 'Environment / secrets', 2, 3, '✱', 'Supply configuration before starting the candidate.', 'Runtime settings connect the same artifact to its environment. Secrets stay out of source and public client bundles.', 'Configuration references', 'Configured candidate', 'A missing required runtime variable may crash the app. Build-time values must be supplied during build instead.'),
  stage('runtime', 'Container / process', 2, 2, '▶', 'Start the application process from the release package.', 'A stored image is not a running app.', 'Artifact and runtime configuration', 'Running candidate process', 'Startup can crash. Containers, VM processes and managed runtimes are alternatives.'),
  stage('port', 'Application port', 2, 3, ':', 'The address and port where the app accepts connections.', 'The proxy must reach the port the app actually listens on.', 'Running process', 'Reachable listener, e.g. port 3000', 'If the app listens on 3000 but the proxy expects 8080, traffic fails.'),
  stage('proxy', 'Reverse proxy', 3, 2, '⇄', 'Route incoming requests to the application.', 'A public entry point forwards traffic to the correct internal service.', 'Incoming request', 'Request to the candidate’s port', 'A wrong upstream address can produce a gateway error.'),
  stage('dns', 'Domain / DNS', 3, 1, '◎', 'Resolve a domain name to a service address.', 'People use a memorable name instead of a server address.', 'Domain name', 'Destination address', 'A wrong record sends users elsewhere even if this app is healthy. DNS setup is often reused across releases.'),
  stage('tls', 'TLS / HTTPS', 3, 3, '◇', 'Establish an encrypted connection with a valid certificate.', 'HTTPS protects data in transit and authenticates the domain.', 'Domain and certificate', 'Secure connection', 'An expired or mismatched certificate can block secure access. TLS may terminate at a proxy or managed edge.'),
  stage('health', 'Health check', 3, 2, '♡', 'Probe the candidate before switching traffic in this model.', 'Starting a process is not proof it is ready to serve users.', 'Candidate and health endpoint', 'Readiness result', 'A failed check keeps this candidate out of service. Health checks do not prove all user journeys work.'),
  stage('live', 'Application LIVE', 4, 1, '✓', 'Switch this model’s traffic to the verified release.', 'A release becomes useful when requests reach it.', 'Healthy reachable candidate', 'Version 2 serving traffic', 'Other deployment strategies may restart in place, use rolling updates or require manual approval.'),
  stage('user', 'User request', 4, 1, '☺', 'A person opens the app in a browser.', 'Deployment is preparation; serving a request is the payoff.', 'Browser request', 'Application response', 'The app can still have bugs or downstream failures after release.'),
];
export const deploymentFailures = [
  { id: 'build', label: 'Build failure', at: 'compile', lesson: 'Compilation stops. No v2 artifact exists, so production v1 stays unchanged.' },
  { id: 'test', label: 'Test failure', at: 'tests', lesson: 'The CI gate rejects this release. Fix the failing check before packaging v2.' },
  { id: 'env', label: 'Missing environment', at: 'runtime', lesson: 'The artifact built, but the candidate crashes without its required runtime configuration. Build-time and runtime settings are different.' },
  { id: 'port', label: 'Port mismatch', at: 'port', lesson: 'The app listens on 3000; the proxy expects 8080. A running process can still be unreachable.' },
  { id: 'health', label: 'Health check failure', at: 'health', lesson: 'The candidate started but is not ready. This model keeps traffic on v1; the unhealthy v2 is not promoted.' },
  { id: 'dns', label: 'DNS misconfiguration', at: 'dns', lesson: 'The app can be healthy while the domain points elsewhere. Retaining v1 does not fix a shared DNS error.' },
  { id: 'tls', label: 'HTTPS problem', at: 'tls', lesson: 'The process runs, but the certificate is invalid. Retaining v1 does not repair a shared HTTPS configuration.' },
] as const;
export type FailureId = typeof deploymentFailures[number]['id'] | 'none';
export interface DeploymentState { cursor: number; status: 'idle' | 'running' | 'failed' | 'live'; production: 1 | 2; scenario: FailureId; }
export const initialDeployment: DeploymentState = { cursor: -1, status: 'idle', production: 1, scenario: 'none' };
export function startDeployment(scenario: FailureId): DeploymentState { return { ...initialDeployment, status: 'running', scenario }; }
export function advanceDeployment(state: DeploymentState): DeploymentState {
  if (state.status !== 'running') return state;
  const cursor = state.cursor + 1;
  const current = deploymentStages[cursor];
  if (!current) return state;
  if (deploymentFailures.find(f => f.id === state.scenario)?.at === current.id) return { ...state, cursor, status: 'failed' };
  if (current.id === 'live') return { ...state, cursor, status: 'live', production: 2 };
  return { ...state, cursor };
}
export const requestStages = ['Browser', 'DNS lookup', 'HTTPS / TLS', 'Reverse proxy', 'Application', 'Optional database', 'Response', 'Browser renders'] as const;
export const requestDescriptions = ['A person opens the application URL.', 'Resolve the domain; cached answers may be reused.', 'Establish or reuse a secure connection.', 'Forward the request to the serving app.', 'The process handles the request.', 'A dynamic app may read data; static sites can skip this.', 'Send status, headers and a response body.', 'Display the result. Deploying code made this request possible.'];
export const deploymentGuide: InfoooGuide = { id: 'from-push-to-user', title: 'From push to user', steps: [
  ['code', 'Write code'], ['push', 'Push code'], ['trigger', 'Trigger deployment'], ['compile', 'Build application'], ['artifact', 'Package it'], ['runtime', 'Start production runtime'], ['tls', 'Connect domain + HTTPS'], ['health', 'Check health'], ['live', 'Go live'], ['user', 'Serve a user'],
].map(([targetId, label]) => ({ id: targetId, targetId, label, description: deploymentStages.find(s => s.id === targetId)!.knowledge!.whyItMatters })) };
