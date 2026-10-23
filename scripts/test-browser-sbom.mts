import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { generateSbom, sbomSample } from '../src/components/toolbox/tools/cycloneDxModel.ts';
import { npmPurl, parseNpmLock, SBOM_LIMITS, sriHashes } from '../src/components/toolbox/tools/npmLockModel.ts';
import { activeTools, getRelatedTools, getTryNextTools } from '../src/data/tools.ts';
const frozen = { serialNumber: 'urn:uuid:12345678-1234-4234-8234-123456789abc', timestamp: '2026-10-23T12:00:00.000Z' };
const fixtures: ReturnType<typeof generateSbom>['bom'][] = [];
function generate(data: unknown) {
  const r = generateSbom(typeof data === 'string' ? data : JSON.stringify(data), frozen);
  assert.deepEqual(r, generateSbom(typeof data === 'string' ? data : JSON.stringify(data), frozen));
  assert.equal(r.bom.specVersion, '1.7'); assert.equal(r.bom.bomFormat, 'CycloneDX');
  const refs = new Set([...r.bom.components.map(c => c['bom-ref']), r.bom.metadata.component?.['bom-ref']].filter(Boolean));
  assert.equal(refs.size, r.bom.components.length + (r.bom.metadata.component ? 1 : 0));
  for (const g of r.bom.dependencies) { assert.ok(refs.has(g.ref)); for (const ref of g.dependsOn ?? []) assert.ok(refs.has(ref)); }
  for (const c of r.bom.components) { assert.equal(c.type, 'library'); assert.ok(!('supplier' in c) && !('externalReferences' in c)); }
  fixtures.push(r.bom); return r;
}
const sample = generate(sbomSample);
assert.equal(sample.inventory.packages.length, 5); assert.equal(sample.inventory.edges, 5);
assert.equal(sample.inventory.packages.filter(p => p.relation === 'Direct').length, 3);
assert.equal(sample.inventory.packages.filter(p => p.relation === 'Transitive').length, 2);
assert.equal(sample.inventory.packages.filter(p => p.dev).length, 1);
assert.equal(sample.inventory.packages.filter(p => p.optional).length, 1);
assert.equal(sample.inventory.packages.filter(p => p.hashes.length).length, 1);
assert.equal(sample.bom.components.find(p => p.name === 'demo-test')!.scope, 'excluded');
assert.ok(!sample.bom.components.find(p => p.name === 'demo-colors')!.scope);
assert.ok(sample.bom.components.find(p => p.name === 'demo-colors')!.properties!.some(p => p.name === 'toolooo:npm:optional'));
assert.deepEqual(sample.bom.components.find(p => p.name === 'ui')!.licenses, [{ license: { name: 'Apache-2.0' } }]);
const v2 = JSON.parse(sbomSample); v2.lockfileVersion = 2; v2.dependencies = { ignoredLegacyEntry: { version: '99.0.0' } };
assert.equal(generate(v2).inventory.packages.length, 5);
assert.equal(npmPurl('@scope/pkg', '1.2.3+build.7'), 'pkg:npm/%40scope/pkg@1.2.3%2Bbuild.7');
assert.equal(npmPurl('MixedCase', '1.0.0'), 'pkg:npm/MixedCase@1.0.0');
assert.equal(npmPurl('name', 'file:/PRIVATE'), undefined); assert.equal(npmPurl('../PRIVATE', '1.0.0'), undefined);
for (const [alg, bytes] of [['sha1', 20], ['sha256', 32], ['sha384', 48], ['sha512', 64]] as const) {
  const digest = createHash(alg).update('fixture').digest(); assert.equal(digest.length, bytes);
  const r = sriHashes(`${alg}-${digest.toString('base64')}`); assert.equal(r.hashes[0].content, digest.toString('hex')); assert.equal(r.issues.length, 0);
}
for (const bad of ['sha512-AAAA', 'sha512-$$$$', 'sha512-AAAA?bad', 'sha512-', 123, null]) assert.equal(sriHashes(bad).hashes.length, 0);
assert.ok(sriHashes('md5-AAAA').issues.some(s => s.includes('Unsupported')));
const first = createHash('sha256').update('one').digest('base64'), second = createHash('sha256').update('two').digest('base64');
assert.equal(sriHashes(`sha256-${first} sha256-${second}`).hashes.length, 0);
const nested = { name: 'fixture', version: '1.0.0', lockfileVersion: 3, packages: {
  '': { dependencies: { a: '1', b: '1' } },
  'node_modules/a': { version: '1.0.0', dependencies: { shared: '1', b: '1' }, optionalDependencies: { missing: '1' } },
  'node_modules/b': { version: '1.0.0', dependencies: { shared: '2' }, peerDependencies: { a: '1' } },
  'node_modules/shared': { version: '1.0.0' },
  'node_modules/b/node_modules/shared': { version: '2.0.0', devOptional: true, inBundle: true },
  'node_modules/extraneous': { version: '1.0.0' },
} };
const n = generate(nested); const row = (name: string, version?: string) => n.inventory.packages.find(p => p.name === name && (!version || p.version === version))!;
assert.ok(n.inventory.graph.find(g => g.ref === row('b').ref)!.dependsOn!.includes(row('shared', '2.0.0').ref));
assert.ok(n.inventory.graph.find(g => g.ref === row('a').ref)!.dependsOn!.includes(row('shared', '1.0.0').ref));
assert.ok(n.inventory.incomplete.includes(row('a').ref));
assert.equal(row('extraneous').relation, 'Unclassified');
assert.ok(n.bom.compositions?.some(c => c.aggregate === 'incomplete'));
const alias = generate({ lockfileVersion: 3, packages: { '': { name: 'alias-fixture', dependencies: { alias: 'npm:real@1' } }, 'node_modules/alias': { name: 'real', version: '1.0.0' } } });
assert.equal(alias.inventory.packages[0].purl, 'pkg:npm/real@1.0.0'); assert.equal(alias.inventory.packages[0].relation, 'Direct');
const workspace = generate({ lockfileVersion: 3, packages: { '': { name: 'workspace-fixture', dependencies: { app: '*' }, workspaces: ['packages/*'] }, 'node_modules/app': { link: true, resolved: 'packages/PRIVATE' }, 'packages/PRIVATE': { name: 'app', version: '1.0.0', dependencies: { library: '1' } }, 'node_modules/library': { version: '1.0.0' } } });
assert.equal(workspace.inventory.packages.length, 2); assert.equal(workspace.inventory.edges, 2); assert.ok(!JSON.stringify(workspace.bom).includes('PRIVATE'));
const missing = generate({ lockfileVersion: 3, packages: { '': { dependencies: { a: '1' } }, 'node_modules/a': {} } });
assert.equal(missing.bom.metadata.component, undefined); assert.ok(!missing.bom.components[0].version && !missing.bom.components[0].purl && !missing.bom.components[0].hashes && !missing.bom.components[0].licenses);
assert.equal(missing.inventory.graph[0].dependsOn, undefined, 'Opaque leaf must not claim zero dependencies');
assert.ok(missing.inventory.findings.some(f => f.message.includes('Root project')));
const privacy = generate({ name: 'private-fixture', lockfileVersion: 3, packages: { '': { dependencies: { a: '*' } }, 'node_modules/a': { version: 'git+https://TOKEN@private.example/PRIVATE', resolved: 'file:C:/PRIVATE/path', integrity: 'invalid-PRIVATE' } } });
assert.ok(!/PRIVATE|TOKEN|private\.example/.test(JSON.stringify(privacy.bom)));
const duplicate = generate({ lockfileVersion: 3, packages: { '': { name: 'duplicates', dependencies: { a: '*', b: '*' } }, 'node_modules/a': { name: 'same', version: '1.0.0', license: 'MIT' }, 'node_modules/b': { name: 'same', version: '1.0.0', license: 'Apache-2.0' } } });
assert.equal(duplicate.bom.components.length, 2); assert.notEqual(duplicate.bom.components[0]['bom-ref'], duplicate.bom.components[1]['bom-ref']);
assert.ok(duplicate.inventory.findings.some(f => f.level === 'WARN' && f.message.includes('conflicting')));
generate({ name: 'empty', version: '1.0.0', lockfileVersion: 3, packages: { '': { name: 'empty', version: '1.0.0' } } });
for (const input of ['{', '[]', 'null', '{"__proto__":{}}', '{"constructor":{}}', JSON.stringify({lockfileVersion:1,dependencies:{a:{version:'1.0.0'}}}), JSON.stringify({lockfileVersion:3,packages:[]}), '['.repeat(65)+']'.repeat(65), ' '.repeat(SBOM_LIMITS.bytes+1)+'{}']) assert.throws(()=>parseNpmLock(input));
const large: Record<string, unknown> = { '': { name: 'large' } };
for(let i=0;i<2000;i++)large[`node_modules/fixture-${i}`]={version:'1.0.0'};
const start=performance.now(); const largeResult=generate({lockfileVersion:3,packages:large});
assert.equal(largeResult.bom.components.length,2000); assert.ok(performance.now()-start<5_000);
const tooMany = { ...large }; for(let i=2000;i<=5000;i++)tooMany[`node_modules/fixture-${i}`]={version:'1.0.0'};
assert.throws(()=>parseNpmLock(JSON.stringify({lockfileVersion:3,packages:tooMany})));
assert.notEqual(generateSbom(sbomSample).bom.serialNumber,generateSbom(sbomSample).bom.serialNumber);
for(const file of ['npmLockModel.ts','cycloneDxModel.ts','sbom.worker.ts','BrowserSbomGenerator.tsx']){
  const source=fs.readFileSync(`src/components/toolbox/tools/${file}`,'utf8');
  assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|sendBeacon|console\.|\beval\s*\(|new Function|URLSearchParams|dangerouslySetInnerHTML/.test(source),file);
}
const tool=activeTools.find(t=>t.id==='browser-sbom-generator')!;
assert.ok(tool&&tool.family==='create'&&tool.privacySensitive&&getRelatedTools(tool).length&&getTryNextTools(tool).length);
for(const target of [...tool.relatedToolIds!,...tool.nextToolIds!])assert.ok(activeTools.some(t=>t.id===target));
assert.equal(new Set(activeTools.map(t=>t.slug)).size,activeTools.length);
fs.mkdirSync('.performance',{recursive:true});fs.writeFileSync('.performance/sbom-test-fixtures.json',JSON.stringify(fixtures));
console.log(`Browser SBOM PASS: v2/v3, nested/hoisted/peer/optional/workspace/alias graph, scoped PURLs, duplicates, SRI, opaque nodes, missing metadata, bounds and 2,000-package fixture (${Math.round(performance.now()-start)}ms including assertions). ${activeTools.length} active; ${activeTools.filter(t=>t.family==='create').length} Create.`);
