import assert from 'node:assert/strict';
import {decideRendering,renderingDefaults} from '../src/components/toolbox/tools/renderingDecisionModel.ts';
const base=decideRendering(renderingDefaults);assert.ok(['SSG','SSG + Islands'].includes(base.winner!.option));assert.equal(base.rows.length,6);
const privateApp=decideRendering({...renderingDefaults,server:true,staticHost:false,personal:'initial',freshness:'request',cache:'private',interactive:'high'});assert.ok(['SSR','Hybrid'].includes(privateApp.winner!.option));
assert.equal(decideRendering({...renderingDefaults,personal:'initial'}).winner,undefined);
const revalidate=decideRendering({...renderingDefaults,server:true,staticHost:false,freshness:'interval',volume:'large',buildBudget:'tight'});assert.equal(revalidate.winner!.option,'ISR / revalidation');
const csr=decideRendering({...renderingDefaults,seo:false,firstLoad:false,interactive:'high',personal:'client',freshness:'request',cache:'private'});assert.equal(csr.winner!.option,'CSR');
for(const r of base.rows){assert.equal(r.fit,Math.round(r.criteria.reduce((n,c)=>n+c.points*c.weight,0)/r.criteria.reduce((n,c)=>n+4*c.weight,0)*100));}
assert.throws(()=>decideRendering({...renderingDefaults,freshness:'fake' as never}));
console.log('Rendering tests passed: public/static, personalized initial HTML, runtime conflicts, revalidation, CSR and inspectable scores.');
