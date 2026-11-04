import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { stripTypeScriptTypes } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const data = async file => import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(fs.readFileSync(path.join(root, file), 'utf8')))}`);
const registry = await data('src/data/tools.ts');
const knowledge = await data('src/data/toolKnowledge.ts');
const chains = await data('src/data/toolChains.ts');
const terminal = new Set(['ai-crawler-policy-builder', 'content-credentials-workflow-doctor']);
for (const tool of registry.activeTools) {
  const text = knowledge.getToolKnowledge(tool);
  for (const key of ['what', 'why', 'whenToUse', 'example']) assert.ok(text[key]?.trim(), `${tool.slug}: ${key}`);
  const next = registry.getTryNextTools(tool, 10);
  const moves = tool.lv3?.nextMoves || [];
  const chainNextIds = (tool.lv3?.chainIds || []).flatMap(id => {
    const chain = chains.toolChains.find(chain => chain.id === id);
    const next = chain?.steps[chain.steps.findIndex(step => step.toolId === tool.id) + 1];
    return next ? [next.toolId] : [];
  });
  const related = registry.getRelatedTools({ ...tool, nextToolIds: [...(tool.nextToolIds || []), ...chainNextIds] }, 10);
  assert.equal(new Set(next.map(t => t.slug)).size, next.length);
  for (const destination of [...next, ...related]) {
    assert.ok(destination.status === 'active' && destination.slug !== tool.slug);
    assert.ok(registry.activeTools.includes(destination));
    assert.match(destination.slug, /^[a-z0-9-]+$/);
  }
  for (const move of moves) assert.ok(registry.activeTools.some(t => t.id === move.targetToolId && t.id !== tool.id));
  const nextIds = new Set([...next.map(t => t.id), ...moves.map(m => m.targetToolId)]);
  for (const id of tool.lv3?.chainIds || []) {
    const chain = chains.toolChains.find(chain => chain.id === id);
    assert.ok(chain);
    const following = chain.steps[chain.steps.findIndex(step => step.toolId === tool.id) + 1];
    if (following) nextIds.add(following.toolId);
  }
  assert.ok(!related.some(t => nextIds.has(t.id)), `${tool.slug}: Next/Related duplicate`);
  if (terminal.has(tool.slug)) assert.equal(next.length, 0, 'The real pipeline verification is outside Toolooo');
  else if (!tool.lv3) assert.ok(next.length > 0, `${tool.slug}: editorial continuation missing`);
}
assert.deepEqual(registry.getTryNextTools({ ...registry.activeTools[0], nextToolIds: [] }), [], 'Similar tags do not invent a Next task');
const sample = registry.activeTools[0], target = registry.activeTools.at(-1);
const planned = { ...target, id: 'test-unavailable', slug: 'test-unavailable', status: 'planned' };
registry.tools.push(planned);
try {
  const next = registry.getTryNextTools({ ...sample, nextToolIds: [sample.id, target.id, target.id, planned.id, 'unknown'] });
  assert.deepEqual(next.map(t => t.id), [target.id], 'No self, duplicate, unavailable or invalid destination');
} finally { registry.tools.pop(); }

// Run real React component functions and real local models with deterministic hook state.
// Presentation children are inert nodes; no network, clipboard, storage or external transport.
function mount(relative, props = {}) {
  const state = [], modules = new Map(); let cursor = 0;
  const jsx = (type, props) => ({ type, props: props || {} });
  const react = {
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
    useMemo: fn => fn(),
  };
  function load(file) {
    file = path.resolve(file); if (modules.has(file)) return modules.get(file);
    const exports = {}; modules.set(file, exports);
    const source = fs.readFileSync(file, 'utf8');
    const require = id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
      if (id.endsWith('.css')) return {};
      const candidate = path.resolve(path.dirname(file), id);
      if (path.basename(path.dirname(candidate)) === 'shared' && !id.endsWith('/mathHelpers') && !id.endsWith('/DecisionLab')) return { __esModule: true, default: path.basename(id) };
      return load(fs.existsSync(candidate) ? candidate : candidate + (fs.existsSync(candidate + '.ts') ? '.ts' : '.tsx'));
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require, console, TextEncoder, TextDecoder, URL }, { filename: file });
    return exports;
  }
  const component = load(path.join(root, relative)).default;
  const render = () => { cursor = 0; return component(props); };
  return { state, render };
}
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
const named = (tree, type) => nodes(tree, node => node.type === type);
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : '';
const insight = harness => named(harness.render(), 'Insight')[0].props;
const toolFile = name => `src/components/toolbox/tools/${name}.tsx`;
function decisionProps(name) {
  const h = mount(toolFile(name));
  return nodes(h.render(), n => typeof n.type === 'function' && n.type.name === 'DecisionLab')[0].props;
}
function weight(harness, dimension, value) {
  named(harness.render(), 'RangeControl').find(n => n.props.label === dimension).props.onChange(value);
}
for (const name of ['DatabaseDecisionLab', 'BuildVsBuy', 'TechStackBattle', 'MonolithVsMicroservicesLab', 'RestVsGraphqlDecisionLab']) {
  const props = decisionProps(name), h = mount('src/components/toolbox/shared/DecisionLab.tsx', props);
  const initial = insight(h); assert.ok(initial.what && initial.why && initial.tip);
  for (const dimension of props.dimensions) weight(h, dimension.label, 0);
  assert.match(insight(h).what, /No priorities selected/);
  assert.match(insight(h).tip, /non-zero/);
}
const rest = mount('src/components/toolbox/shared/DecisionLab.tsx', decisionProps('RestVsGraphqlDecisionLab'));
for (const [dimension, option, action] of [['Simple Caching', 'REST', 'resource endpoints'], ['Real-time / Streaming', 'gRPC', 'generated clients'], ['Query Flexibility', 'GraphQL', 'resolver work']]) {
  for (const range of named(rest.render(), 'RangeControl')) weight(rest, range.props.label, 0);
  weight(rest, dimension, 10);
  assert.ok(insight(rest).what.includes(option)); assert.ok(insight(rest).tip.includes(action));
}
const oneDimension = [{ key: 'fit', label: 'Fit' }];
const equalOptions = ['A', 'B'].map(name => ({ name, color: '#000000', scores: { fit: 5 } }));
const tied = mount('src/components/toolbox/shared/DecisionLab.tsx', { dimensions: oneDimension, options: equalOptions, assumptionsNote: 'Fixture' });
assert.match(insight(tied).what, /A and B tie/);
const blocked = mount('src/components/toolbox/shared/DecisionLab.tsx', { dimensions: oneDimension, options: equalOptions.map(option => ({ ...option, dealBreakers: [{ dimensionKey: 'fit', whenPriorityAtLeast: 1, reason: 'Constraint fixture' }] })), assumptionsNote: 'Fixture' });
assert.match(insight(blocked).what, /No option clears/); assert.match(insight(blocked).tip, /another option/);

const quote = mount(toolFile('ProjectQuoteRiskPlanner'));
assert.match(insight(quote).what, /115\.0 estimated hours become 148\.5h/);
assert.match(insight(quote).tip, /Backend Development.*10.5h/);
assert.deepEqual(named(quote.render(), 'Metric').map(n => n.props.value), ['115h', '149h', '193h', '29%'], 'Existing scenario arithmetic unchanged (twice-applied total = 193.125h)');
named(quote.render(), 'InputField').find(n => n.props.label === 'Third-Party Integrations').props.onChange('0');
assert.match(insight(quote).tip, /Backend Development/, 'A high percentage on a zero-hour line must not drive advice');
for (const field of named(quote.render(), 'InputField')) field.props.onChange('0');
assert.match(insight(quote).what, /No estimated hours/); assert.match(insight(quote).tip, /Enter estimated work/);

const cache = mount(toolFile('CacheValueSimulator'));
const ttl = value => named(cache.render(), 'RangeControl').find(n => n.props.label === 'Cache TTL').props.onChange(value);
const entryAge = () => named(cache.render(), 'Metric').find(n => n.props.label === 'Avg. entry age on hit').props;
ttl(1); assert.equal(parseFloat(entryAge().value), 0);
ttl(200); assert.ok(parseFloat(entryAge().value) > 0, 'TTL simulation still derives age from insertion time');
assert.equal(entryAge().sublabel, 'time since insertion in this simulation');

function press(h, label) { named(h.render(), 'button').find(n => text(n) === label).props.onClick(); }
for (const [before, after, expected] of [['{"id":1}', '{"id":"changed"}', /potentially breaking/], ['{"id":1}', '{"id":1}', /No differences/], ['{"id":1}', '{"id":1,"extra":true}', /compatible additions/]]) {
  const h = mount(toolFile('DataContractDriftDoctor')); h.render();
  h.state[0] = before; h.state[1] = after; press(h, 'Compare contracts');
  assert.match(insight(h).what, expected); assert.ok(insight(h).tip);
  named(h.render(), 'textarea')[0].props.onChange({ target: { value: '{"edited":true}' } });
  assert.equal(named(h.render(), 'Insight').length, 0, 'Edited samples cannot keep a current explanation');
}
const sloModel = await data('src/components/toolbox/tools/sloIncidentModel.ts');
for (const [input, decision] of [[sloModel.sloDefault, /fits within/], [{ ...sloModel.sloDefault, days: 1, errors: 100 }, /exceeds/], [{ ...sloModel.sloDefault, target: 93.75, days: 1, rpm: 1, start: 0, duration: 90, errors: 100, detect: 0, mitigate: 0, recover: 0 }, /exhausts/]]) {
  const h = mount(toolFile('SloIncidentBurnSimulator')); h.render(); h.state[0] = input;
  press(h, 'Simulate incident burn'); assert.match(insight(h).what, decision);
  if (sloModel.simulateSlo(input).remaining <= 0) assert.match(insight(h).tip, /No budget headroom/);
  press(h, 'Reset'); assert.equal(named(h.render(), 'Insight').length, 0);
}
console.log(`Knowledge content PASS: ${registry.activeTools.length} active registries/continuations; no Next/Related duplicates; five shared decisions, zero weights, ties, constraints, option-specific actions; unchanged quote arithmetic; contract and SLO conclusions, edited-input clearing and reset.`);

export function verifyToolKnowledgeBuild() {
  const hrefs = html => [...html.matchAll(/<a\b([^>]*)>/g)].map(match => ({
    href: match[1].match(/\bhref="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&'),
    next: /data-discovery-action="next"/.test(match[1]),
    related: /class="[^"]*\btp-related-item\b/.test(match[1]),
  }));
  for (const tool of registry.activeTools) {
    const html = fs.readFileSync(path.join(root, 'dist/toolbox', tool.slug, 'index.html'), 'utf8');
    for (const heading of ['What', 'Why']) assert.match(html, new RegExp(`<h3[^>]*>${heading}</h3>`));
    assert.ok(html.includes('How to read the result') && html.includes('Assumptions and limits'));
    const anchors = hrefs(html), next = anchors.filter(a => a.next).map(a => a.href);
    const lv3 = html.match(/<section\b[^>]*aria-label="Toolooo connections"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    if (lv3) next.push(...hrefs(lv3).map(a => a.href));
    const related = anchors.filter(a => a.related).map(a => a.href);
    assert.ok(!related.some(href => next.includes(href)), `${tool.slug}: rendered Next/Related overlap`);
    assert.equal(new Set(related).size, related.length);
    if (terminal.has(tool.slug)) assert.equal(next.length, 0, `${tool.slug}: no fabricated in-app Next`);
    for (const href of [...next, ...related]) {
      assert.ok(href && !/[?#]/.test(href), `${tool.slug}: clean public discovery URL`);
      const slug = href.match(/\/toolbox\/([^/]+)\/$/)?.[1];
      assert.ok(registry.activeTools.some(t => t.slug === slug && t.slug !== tool.slug), `${tool.slug}: active canonical destination`);
      assert.ok(fs.existsSync(path.join(root, 'dist/toolbox', slug, 'index.html')), `${tool.slug}: generated destination exists`);
    }
  }
  console.log(`Knowledge HTML PASS: ${registry.activeTools.length} active pages retain static context and canonical working discovery, without Next/Related overlap or invented terminal links.`);
}
