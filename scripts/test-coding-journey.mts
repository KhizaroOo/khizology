import assert from 'node:assert/strict';
import fs from 'node:fs';
import { journey, tasks, tools, failures, challenges, initialRun, advance, recover, gateStatus, permission, type RunState } from '../src/components/infooo/coding/codingJourney.ts';
for (const task of tasks) for (const plan of [true, false]) for (const autonomy of ['assisted', 'balanced', 'autonomous'] as const) for (const scenario of ['none', ...failures.map(f => f.id)] as const) {
  const steps = journey(task.id, plan, scenario);
  let state: RunState = { ...initialRun, status: 'running' };
  let stops = 0, approvals = 0;
  for (let guard = 0; guard < 100 && state.status !== 'done'; guard++) {
    state = advance(state, steps, autonomy);
    if (state.status === 'blocked') {
      stops++;
      assert.deepEqual(advance(state, steps, autonomy), state, 'cannot advance past unresolved fault');
      const failed = steps[state.index];
      if (failed.gate) assert.equal(gateStatus(state, steps, failed.gate), 'FAIL');
      assert.equal(gateStatus(state, steps, 'Diff review'), failed.id === 'diff' ? 'FAIL' : 'Pending');
      state = recover(state, steps);
      if (failed.id === 'mobile') assert.equal(steps[state.index + 1].id, 'desktop', 'desktop and mobile rechecked');
    } else if (state.status === 'approval') {
      approvals++;
      assert.deepEqual(advance(state, steps, autonomy), state);
      state = { ...state, approved: [...state.approved, state.index], status: 'running' };
    }
  }
  assert.equal(state.status, 'done', `${task.id}/${plan}/${autonomy}/${scenario}`);
  assert.equal(stops, scenario === 'none' ? 1 : 2);
  assert.equal(approvals, autonomy === 'assisted' ? 1 : 0);
  for (const gate of ['Type check', 'Lint', 'Unit tests', 'Build', 'Desktop UI', 'Mobile UI', 'Diff review']) assert.equal(gateStatus(state, steps, gate), 'PASS');
  assert.equal(steps.some(s => s.id === 'plan'), plan);
  const paused = { ...state, status: 'paused' as const };
  assert.deepEqual(advance(paused, steps, autonomy), paused);
}
const finale = journey('feature', true, 'none', true);
let finalState: RunState = { ...initialRun, status: 'running' };
let faults = [];
for (let guard = 0; guard < 80 && finalState.status !== 'done'; guard++) {
  finalState = advance(finalState, finale, 'balanced');
  if (finalState.status === 'blocked') { faults.push(finale[finalState.index].fault); finalState = recover(finalState, finale); }
}
assert.deepEqual(faults, ['feedback', 'ui']); assert.equal(finalState.status, 'done');
for (const autonomy of ['assisted', 'balanced', 'autonomous'] as const) {
  assert.match(permission('push', autonomy), /^Blocked/);
  for (const action of ['delete', 'migration']) assert.match(permission(action, autonomy), /^Ask human/);
  for (const action of ['read', 'test']) assert.match(permission(action, autonomy), /^Allowed/);
}
assert.match(permission('edit', 'assisted'), /^Ask human/);
assert.equal(tools.length, 7); assert.equal(challenges.length, 5);
for (const challenge of challenges) { assert.ok(challenge.answer < challenge.choices.length); assert.ok(failures.some(f => f.id === challenge.scenario)); }
const html = fs.readFileSync(new URL('../dist/infooo/ai-coding-agent-journey/index.html', import.meta.url), 'utf8');
assert.match(html, /<h1[^>]*>AI Coding Agent Journey<\/h1>/);
assert.match(html, /WebApplication/); assert.match(html, /BreadcrumbList/); assert.match(html, /coding-social.png/);
assert.match(html, /https:\/\/khizooology.com\/infooo\/ai-coding-agent-journey\//);
for (const filename of ['sitemap-0.xml', 'llms.txt']) assert.ok(fs.readFileSync(new URL(`../dist/${filename}`, import.meta.url), 'utf8').includes('/infooo/ai-coding-agent-journey/'));
const component = fs.readFileSync(new URL('../src/components/infooo/coding/AICodingAgentJourney.tsx', import.meta.url), 'utf8');
assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|eval\(/.test(component));
assert.ok(component.includes('disabled={answer !== challenges[challenge].answer}'));
console.log('Coding journey passed: 162 task/plan/autonomy/fault combinations, bounded permissions, paused/blocked gates, repairs and reruns, five challenges, finale, generated SEO/sitemap/llms and privacy.');
