/** Local teaching model, not a payment or identity protocol implementation. All money is integer simulated cents. */
export type Permission = 'research' | 'image' | 'data' | 'compute';
export type Autonomy = 'assisted' | 'delegated' | 'autonomous';
export type Mission = 'campaign' | 'machine' | 'ambiguous';
export type Phase = 'idle' | 'authorize' | 'discover' | 'identity' | 'authority' | 'budget' | 'payment' | 'deliver' | 'use' | 'audit' | 'complete';
export type Failure = 'overspend' | 'intent' | 'identity' | 'merchant' | 'unlimited' | 'duplicate';
export type GateReason = 'allow' | 'duplicate' | 'invalid' | 'revoked' | 'expired' | 'identity' | 'intent' | 'permission' | 'merchant' | 'unlimited' | 'budget' | 'approval' | 'ambiguous' | 'conflict';
export interface Service { id: Permission; name: string; units: number; unitCents: number; intent: 'campaign' | 'unrelated'; trusted: boolean }
export interface Authority { verified: boolean; revoked: boolean; expiresAt: number; permissions: Permission[]; cap: number | null; owner: string }
export interface Receipt { key: string; fingerprint: string; cents: number; service: Permission }
export interface Delegate { permissions: Permission[]; cap: number; spent: number; expiresAt: number }
export interface EconomyState {
  mission: Mission; autonomy: Autonomy; authority: Authority; services: Service[]; index: number; phase: Phase;
  status: 'ready' | 'running' | 'approval' | 'blocked' | 'complete'; reason: GateReason; time: number;
  spent: number; receipts: Receipt[]; log: { time: number; text: string }[]; approved: boolean;
  clarified: boolean; scenario?: Failure; retried: boolean; delegate?: Delegate;
}
const validMoney = (n: number) => Number.isSafeInteger(n) && n >= 0;
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export const failures: { id: Failure; label: string; lesson: string }[] = [
  { id: 'overspend', label: 'Over budget', lesson: 'Financial autonomy still needs a spending limit.' },
  { id: 'intent', label: 'Wrong purchase', lesson: 'Permission must follow the approved mission.' },
  { id: 'identity', label: 'Unknown agent', lesson: 'A merchant needs evidence of who is acting.' },
  { id: 'merchant', label: 'Untrusted merchant', lesson: 'The agent must check the other side too.' },
  { id: 'unlimited', label: 'Unlimited permission', lesson: 'Capability is not permission; restore a narrow spending limit.' },
  { id: 'duplicate', label: 'Payment timeout', lesson: 'An uncertain response is not a reason to pay twice.' },
];
export function initialEconomy(mission: Mission = 'campaign', autonomy: Autonomy = 'delegated', cap = 2000, scenario?: Failure): EconomyState {
  const services: Service[] = mission === 'machine'
    ? [{ id: 'data', name: 'Data API', units: 1, unitCents: 3, intent: 'campaign', trusted: true }, { id: 'compute', name: 'Compute', units: 1, unitCents: 15, intent: 'campaign', trusted: true }, { id: 'image', name: 'Image service', units: 1, unitCents: 12, intent: 'campaign', trusted: true }]
    : [{ id: 'research', name: 'Research', units: 1, unitCents: 8, intent: 'campaign', trusted: true }, { id: 'image', name: 'Image service', units: 4, unitCents: 12, intent: 'campaign', trusted: true }, { id: 'data', name: 'Data API', units: 1, unitCents: 3, intent: 'campaign', trusted: true }];
  if (scenario === 'overspend') services[0] = { ...services[0], units: 1, unitCents: 2450 };
  if (scenario === 'intent') services[0] = { ...services[0], name: 'Gaming subscription', intent: 'unrelated' };
  if (scenario === 'merchant') services[0] = { ...services[0], trusted: false, unitCents: 1 };
  return { mission, autonomy, authority: { verified: scenario !== 'identity', revoked: false, expiresAt: 900, permissions: services.map(v => v.id), cap: scenario === 'unlimited' ? null : cap, owner: 'Example Organization' }, services, index: 0, phase: 'idle', status: 'ready', reason: 'allow', time: 0, spent: 0, receipts: [], log: [], approved: false, clarified: mission !== 'ambiguous', scenario, retried: false };
}
export function currentService(s: EconomyState) { return s.services[Math.min(s.index, s.services.length - 1)]; }
export function transactionKey(s: EconomyState) { return `${s.mission}-${s.index}`; }
const fingerprint = (v: Service) => `${v.id}:${v.intent}:${v.units}:${v.unitCents}:${v.trusted}`;
export function canSpend(cap: number | null, spent: number, cents: number) { return cap !== null && validMoney(cap) && validMoney(spent) && validMoney(cents) && cents <= cap - spent; }
export function canAct(s: EconomyState): GateReason {
  if (s.authority.revoked) return 'revoked';
  if (!Number.isFinite(s.time) || !Number.isFinite(s.authority.expiresAt) || s.time >= s.authority.expiresAt) return 'expired';
  if (!s.clarified) return 'ambiguous';
  if (!s.authority.verified) return 'identity';
  const v = currentService(s);
  if (v.intent !== 'campaign') return 'intent';
  if (!s.authority.permissions.includes(v.id)) return 'permission';
  if (!v.trusted) return 'merchant';
  if (s.authority.cap === null) return 'unlimited';
  const cents = v.units * v.unitCents;
  if (!Number.isSafeInteger(v.units) || v.units < 1 || !validMoney(v.unitCents) || !validMoney(cents) || !validMoney(s.spent)) return 'invalid';
  if (!canSpend(s.authority.cap, s.spent, cents)) return 'budget';
  if (s.delegate && v.id === 'research') {
    if (s.time >= s.delegate.expiresAt) return 'expired';
    if (!s.delegate.permissions.includes(v.id)) return 'permission';
    if (!canSpend(s.delegate.cap, s.delegate.spent, cents)) return 'budget';
  }
  return s.autonomy === 'assisted' && !s.approved ? 'approval' : 'allow';
}
export function authorizeTransaction(s: EconomyState): { reason: GateReason; cents: number } {
  const v = currentService(s), existing = s.receipts.find(r => r.key === transactionKey(s));
  if (existing) return { reason: existing.fingerprint === fingerprint(v) ? 'duplicate' : 'conflict', cents: 0 };
  const reason = canAct(s);
  return { reason, cents: reason === 'allow' ? v.units * v.unitCents : 0 };
}
function record(s: EconomyState, text: string): EconomyState { return { ...s, log: [...s.log, { time: s.time, text }].slice(-60) }; }
function blocked(s: EconomyState, reason: GateReason) { return record({ ...s, reason, status: reason === 'approval' ? 'approval' : 'blocked' }, reason === 'approval' ? 'Waiting for human payment approval.' : `Stopped: ${gateCopy[reason]}`); }
export const gateCopy: Record<GateReason, string> = {
  allow: 'Allowed within this mission.', duplicate: 'Existing receipt found — no second charge.', invalid: 'Invalid simulated amount; no payment made.', revoked: 'Authority revoked; no new purchases.', expired: 'Authority expired; request a new approval.', identity: 'Unknown agent — verification required.', intent: 'This purchase does not match the campaign.', permission: 'This capability was not authorized.', merchant: 'Merchant not trusted — pause for human review.', unlimited: 'No spending cap — high risk; restore a limit.', budget: 'The purchase exceeds remaining authority.', approval: 'A human must confirm this payment.', ambiguous: '“Best” is unclear — ask the human first.', conflict: 'The same payment reference was reused for a different request.',
};
export function startEconomy(s: EconomyState): EconomyState { return s.phase === 'idle' ? record({ ...s, phase: 'authorize', status: 'running' }, 'Goal received; bounded authority requested.') : s; }
export function advanceEconomy(s: EconomyState): EconomyState {
  if (s.status !== 'running') return s;
  let next: EconomyState = { ...s, time: s.time + 10 };
  const v = currentService(next);
  if (s.phase === 'authorize') {
    if (!next.clarified) return blocked(next, 'ambiguous');
    if (next.authority.revoked || next.time >= next.authority.expiresAt) return blocked(next, next.authority.revoked ? 'revoked' : 'expired');
    return record({ ...next, phase: 'discover' }, 'Acting for Example Organization; only approved campaign services.');
  }
  if (s.phase === 'discover') return record({ ...next, phase: 'identity' }, `${v.name} discovered; merchant requests agent identity.`);
  if (s.phase === 'identity') return next.authority.verified ? record({ ...next, phase: 'authority' }, 'Example agent identity recognized; identity alone is not permission.') : blocked(next, 'identity');
  if (s.phase === 'authority') {
    const reason = canAct(next);
    if (reason !== 'allow' && reason !== 'approval' && reason !== 'budget') return blocked(next, reason);
    return record({ ...next, phase: 'budget' }, 'Intent, permissions and merchant checked for this purchase.');
  }
  if (s.phase === 'budget') {
    const reason = canAct(next);
    if (reason !== 'allow') return blocked(next, reason);
    return record({ ...next, phase: 'payment' }, `${money(v.units * v.unitCents)} fits the remaining authorized budget.`);
  }
  if (s.phase === 'payment') {
    const tx = authorizeTransaction(next);
    if (tx.reason !== 'allow' && tx.reason !== 'duplicate') return blocked(next, tx.reason);
    if (tx.reason === 'duplicate') return record({ ...next, reason: 'duplicate', phase: 'deliver' }, 'Timeout retry matched the existing receipt; charged $0.00 again.');
    next = { ...next, spent: next.spent + tx.cents, receipts: [...next.receipts, { key: transactionKey(next), fingerprint: fingerprint(v), cents: tx.cents, service: v.id }], delegate: next.delegate && v.id === 'research' ? { ...next.delegate, spent: next.delegate.spent + tx.cents } : next.delegate };
    if (s.scenario === 'duplicate' && s.index === 0 && !s.retried) return record({ ...next, retried: true }, 'Payment recorded, but the response timed out; retrying the same reference.');
    return record({ ...next, reason: 'allow', phase: 'deliver' }, `${v.name}: ${money(tx.cents)} simulated payment recorded.`);
  }
  if (s.phase === 'deliver') return record({ ...next, phase: 'use' }, `${v.name} delivered an illustrative result; no live service was called.`);
  if (s.phase === 'use') return next.index < next.services.length - 1 ? record({ ...next, index: next.index + 1, phase: 'discover', approved: false, reason: 'allow' }, 'Result informs the next approved service request.') : record({ ...next, phase: 'audit' }, 'All requested results received; check purchases against authority.');
  if (s.phase === 'audit') return record({ ...next, phase: 'complete', status: 'complete' }, `Mission complete: ${next.receipts.length} services, ${money(next.spent)} spent; receipts remain visible.`);
  return s;
}
export function resumeEconomy(s: EconomyState): EconomyState { return { ...s, status: 'running', reason: 'allow' }; }
export function approvePayment(s: EconomyState): EconomyState { return s.status === 'approval' ? record(resumeEconomy({ ...s, approved: true }), 'Human approved this one simulated payment, not future purchases.') : s; }
export function revokeEconomy(s: EconomyState): EconomyState { return blocked({ ...s, authority: { ...s.authority, revoked: true } }, 'revoked'); }
export function expireEconomy(s: EconomyState): EconomyState { return blocked({ ...s, time: Math.max(s.time, s.authority.expiresAt) }, 'expired'); }
export function delegateAuthority(s: EconomyState, permissions: Permission[] = ['research'], cap = 200): Delegate {
  const active = !s.authority.revoked && s.time < s.authority.expiresAt;
  return { permissions: active ? permissions.filter(p => p === 'research' && s.authority.permissions.includes(p)) : [], cap: active && validMoney(cap) && s.authority.cap !== null && validMoney(s.authority.cap) && validMoney(s.spent) ? Math.max(0, Math.min(cap, 200, s.authority.cap - s.spent)) : 0, spent: 0, expiresAt: Math.min(s.authority.expiresAt, s.time + 300) };
}
export const challenges = [
  { question: 'The agent has $5. A purchase costs $8. What should happen?', options: ['Pay anyway', 'Ask the merchant to ignore it', 'Block; request new authority'], answer: 2, why: 'The agent cannot expand its own spending authority.' },
  { question: 'Research is allowed. A gaming subscription is attempted. What failed?', options: ['The payment speed', 'The approved intent', 'The image quality'], answer: 1, why: 'Being able to buy something does not mean it serves the approved goal.' },
  { question: 'A specialist only needs research. What should it receive?', options: ['The full wallet', 'Unlimited permission', 'Research access and a smaller cap'], answer: 2, why: 'Delegation should narrow authority and retain the parent budget limit.' },
  { question: 'A payment response times out. What should a retry do?', options: ['Create a new charge', 'Reuse the same reference and reconcile', 'Forget all receipts'], answer: 1, why: 'A matching receipt prevents a second charge; an uncertain result needs reconciliation.' },
] as const;
