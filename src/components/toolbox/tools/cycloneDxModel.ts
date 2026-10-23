import { parseNpmLock, type LockInventory, type LockPackage } from './npmLockModel.ts';

// CycloneDX-specific mapping is isolated from npm parsing; schema source is linked in the UI.
interface Component {
  type: 'application' | 'library'; 'bom-ref'?: string; name: string; group?: string; version?: string;
  purl?: string; scope?: 'excluded'; hashes?: LockPackage['hashes'];
  licenses?: { license: { name: string } }[]; properties?: { name: string; value: string }[];
}
function secureSerial() {
  if (typeof crypto.randomUUID === 'function') return `urn:uuid:${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = bytes[6] & 15 | 64; bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `urn:uuid:${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function buildCycloneDx(inventory: LockInventory, options: { serialNumber?: string; timestamp?: string } = {}) {
  const serialNumber = options.serialNumber ?? secureSerial(), timestamp = options.timestamp ?? new Date().toISOString();
  if (!/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(serialNumber)) throw new Error('BOM identity must be a UUID URN.');
  if (!Number.isFinite(Date.parse(timestamp)) || new Date(timestamp).toISOString() !== timestamp) throw new Error('BOM generation time must be a valid ISO timestamp.');
  const components: Component[] = inventory.packages.map((p): Component => {
    const slash = p.name.indexOf('/'), scoped = p.name.startsWith('@') && slash > 0;
    const properties = ([['dev', p.dev], ['optional', p.optional], ['devOptional', p.devOptional], ['inBundle', p.bundled]] as const).filter(([, yes]) => yes).map(([name]) => ({ name: `toolooo:npm:${name}`, value: 'true' }));
    return { type: 'library', 'bom-ref': p.ref, name: scoped ? p.name.slice(slash + 1) : p.name, ...(scoped ? { group: p.name.slice(0, slash) } : {}), ...(p.version ? { version: p.version } : {}), ...(p.purl ? { purl: p.purl } : {}), ...(p.dev ? { scope: 'excluded' } : {}), ...(p.hashes.length ? { hashes: p.hashes } : {}), ...(p.license ? { licenses: [{ license: { name: p.license } }] } : {}), ...(properties.length ? { properties } : {}) };
  });
  const root: Component | undefined = inventory.project.name && inventory.project.ref ? { type: 'application', 'bom-ref': inventory.project.ref, name: inventory.project.name, ...(inventory.project.version ? { version: inventory.project.version } : {}) } : undefined;
  return {
    $schema: 'https://cyclonedx.org/schema/bom-1.7.schema.json', bomFormat: 'CycloneDX' as const, specVersion: '1.7' as const, serialNumber, version: 1,
    metadata: { timestamp, lifecycles: [{ phase: 'pre-build' }], tools: { components: [{ type: 'application', name: 'Toolooo Browser SBOM Generator' }] }, ...(root ? { component: root } : {}) },
    components, dependencies: inventory.graph,
    ...(inventory.incomplete.length ? { compositions: [{ aggregate: 'incomplete', dependencies: inventory.incomplete }] } : {}),
  };
}
export function generateSbom(input: string, options: Parameters<typeof buildCycloneDx>[1] = {}) {
  const inventory = parseNpmLock(input), bom = buildCycloneDx(inventory, options);
  return { inventory, bom };
}

// Fictional packages; SRI is SHA-512 of "fictional demo package contents", not a fetched artifact.
export const sbomSample = JSON.stringify({ name: 'fictional-demo', version: '1.0.0', lockfileVersion: 3, packages: {
  '': { name: 'fictional-demo', version: '1.0.0', dependencies: { 'demo-widget': '^2.0.0', '@demo/ui': '^1.0.0' }, devDependencies: { 'demo-test': '^1.0.0' } },
  'node_modules/demo-widget': { version: '2.1.0', license: 'MIT', resolved: 'https://registry.npmjs.org/demo-widget/-/demo-widget-2.1.0.tgz', integrity: 'sha512-iXvydJc8B51zHcWROvRmoHdSwiuGWWmaubHdTlA9XztsNiR+ESsYCFCdOwpIwvUENTYfO1tLP2Ca9/YndePUzg==', dependencies: { 'demo-core': '^1.0.0' } },
  'node_modules/demo-core': { version: '1.3.0' },
  'node_modules/@demo/ui': { version: '1.0.0', license: 'Apache-2.0', optionalDependencies: { 'demo-colors': '^1.0.0' } },
  'node_modules/demo-colors': { version: '1.0.2', optional: true },
  'node_modules/demo-test': { version: '1.0.0', dev: true },
} }, null, 2);
