import assert from 'node:assert/strict';
import {networkDefaults,simulateNetwork,retryStrategies} from '../src/components/toolbox/tools/networkFailureModel.ts';
assert.deepEqual(simulateNetwork(networkDefaults,'Fixed'),simulateNetwork(networkDefaults,'Fixed'));
const ok=simulateNetwork({...networkDefaults,failureRate:0,jitter:0},'Immediate');assert.equal(ok.successRate,100);assert.equal(ok.totalAttempts,12);
const offline=simulateNetwork({...networkDefaults,mode:'offline'},'Exponential');assert.equal(offline.successRate,0);assert.equal(offline.totalAttempts,48);assert.equal(offline.worstWait,1400);
assert.equal(simulateNetwork({...networkDefaults,mode:'offline'},'None').totalAttempts,12);
const recover=simulateNetwork({...networkDefaults,mode:'recovery'},'Exponential');assert.ok(recover.successRate>0);assert.equal(recover.trace[0].outcome,'Offline');
const rate=simulateNetwork({...networkDefaults,mode:'429',retryAfter:5000},'Immediate');assert.equal(rate.trace[0].retryWait,5000);
assert.equal(simulateNetwork({...networkDefaults,mode:'slow',latency:400,jitter:0},'None').timeouts,12);
assert.ok(simulateNetwork({...networkDefaults,mode:'500',requestType:'write',idempotent:false},'Fixed').duplicateRisk>0);
for(const strategy of retryStrategies){const r=simulateNetwork({...networkDefaults,requests:100,retries:5},strategy);assert.ok(r.trace.length<=600);assert.ok(r.trace.every(t=>t.latency>=0&&t.retryWait>=0));}
assert.throws(()=>simulateNetwork({...networkDefaults,requests:101},'None'));assert.throws(()=>simulateNetwork({...networkDefaults,maxBackoff:1},'Fixed'));
console.log('Network UX tests passed: reproducible comparisons, recovery, 429 floor, timeout, exhaustion, write replay risks and bounds.');
