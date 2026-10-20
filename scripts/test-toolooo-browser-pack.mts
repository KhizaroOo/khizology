import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tools,getRelatedTools,getTryNextTools} from '../src/data/tools.ts';
const additions=[['browser-security-policy-doctor','check','BrowserSecurityPolicyDoctor','securityPolicyModel'],['browser-event-loop-simulator','simulate','BrowserEventLoopSimulator','eventLoopModel'],['client-state-storage-decision-lab','decide','ClientStateStorageDecisionLab','clientStorageModel'],['web-performance-budget-planner','plan','WebPerformanceBudgetPlanner','performanceBudgetModel'],['llm-eval-case-builder','create','LlmEvalCaseBuilder','llmEvalModel']];
additions.push(['frontend-data-exposure-doctor','check','FrontendDataExposureDoctor','dataExposureModel'],['network-failure-ux-simulator','simulate','NetworkFailureUxSimulator','networkFailureModel'],['web-rendering-strategy-decision-lab','decide','WebRenderingStrategyDecisionLab','renderingDecisionModel'],['accessibility-remediation-planner','plan','AccessibilityRemediationPlanner','accessibilityPlanModel'],['ui-edge-state-matrix-builder','create','UiEdgeStateMatrixBuilder','edgeStateModel']);
additions.push(['data-contract-drift-doctor','check','DataContractDriftDoctor','dataContractModel'],['slo-incident-burn-simulator','simulate','SloIncidentBurnSimulator','sloIncidentModel'],['llm-output-assurance-decision-lab','decide','LlmOutputAssuranceDecisionLab','llmAssuranceModel'],['ux-research-study-planner','plan','UxResearchStudyPlanner','uxResearchModel'],['cloud-cost-guardrail-builder','create','CloudCostGuardrailBuilder','cloudGuardrailModel']);
additions.push(['mcp-security-doctor','check','McpSecurityDoctor','mcpSecurityModel']);
additions.push(['ai-agent-cost-loop-simulator','simulate','AgentCostLoopSimulator','agentCostModel']);
additions.push(['real-time-transport-decision-lab','decide','RealTimeTransportDecisionLab','transportDecisionModel']);
additions.push(['ai-agent-permission-planner','plan','AgentPermissionPlanner','agentPermissionModel']);
additions.push(['mcp-tool-contract-builder','create','McpToolContractBuilder','mcpContractModel']);
additions.push(['opentelemetry-trace-doctor','check','OpenTelemetryTraceDoctor','otelTraceModel']);
additions.push(['cache-stampede-simulator','simulate','CacheStampedeSimulator','cacheStampedeModel']);
additions.push(['workflow-agent-decision-lab','decide','WorkflowAgentDecisionLab','workflowDecisionModel']);
additions.push(['passkey-migration-planner','plan','PasskeyMigrationPlanner','passkeyPlanModel']);
additions.push(['api-error-contract-builder','create','ApiErrorContractBuilder','apiErrorModel']);
const registered=additions.filter(([slug])=>tools.some(t=>t.slug===slug));
assert.equal(tools.length,45+registered.length);assert.equal(new Set(tools.map(t=>t.id)).size,tools.length);assert.equal(new Set(tools.map(t=>t.slug)).size,tools.length);
if(process.argv.includes('--final'))assert.equal(registered.length,additions.length);
const sitemap=fs.readFileSync('dist/sitemap-0.xml','utf8'),llms=fs.readFileSync('dist/llms.txt','utf8'),robots=fs.readFileSync('dist/robots.txt','utf8');assert.ok(/Sitemap:/.test(robots));
for(const [slug,family,component,model] of registered){
 const tool=tools.find(t=>t.slug===slug)!;assert.equal(tool.family,family);assert.equal(tool.status,'active');
 for(const id of tool.relatedToolIds??[])assert.ok(tools.some(t=>t.id===id&&t.status==='active'&&t.id!==tool.id),`${slug}: invalid related tool ${id}`);
 for(const id of tool.nextToolIds??[])assert.ok(tools.some(t=>t.id===id&&t.status==='active'&&t.id!==tool.id)&&getTryNextTools(tool,10).some(t=>t.id===id),`${slug}: invalid next tool ${id}`);
 for(const id of (tool.relatedToolIds??[]).slice(0,3))assert.ok(getRelatedTools(tool,3).some(t=>t.id===id),`${slug}: required workflow relationship hidden`);
 if(tool.relatedToolIds?.length)assert.ok(getRelatedTools(tool,3).every(t=>tool.relatedToolIds!.includes(t.id)),`${slug}: unrelated fallback link`);
 const html=fs.readFileSync(`dist/toolbox/${slug}/index.html`,'utf8');
 assert.ok(sitemap.includes(`https://khizooology.com/toolbox/${slug}/`));assert.ok(llms.includes(`/toolbox/${slug}/`));assert.ok(html.includes(`https://khizooology.com/toolbox/${slug}/`));
 for(const marker of ['name="description"','property="og:title"','property="og:image"','property="og:image:alt"','name="twitter:card"','application/ld+json','BreadcrumbList','data-tool-knowledge-next','tp-related-item','<h1'])assert.ok(html.includes(marker),`${slug}: missing ${marker}`);
 assert.ok(!/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/.test(html));const title=html.match(/<title>(.*?)<\/title>/s)?.[1];assert.ok(title&&title.length<70);
 for(const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs))assert.doesNotThrow(()=>JSON.parse(match[1]));
 const related=getRelatedTools(tool,3),next=getTryNextTools(tool,2+related.length).filter(t=>!related.some(r=>r.id===t.id)).slice(0,2);assert.ok(next.length);assert.ok([...related,...next].every(t=>fs.existsSync(`dist/toolbox/${t.slug}/index.html`)));
 for(const file of [`${component}.tsx`,`${model}.ts`]){const source=fs.readFileSync(`src/components/toolbox/tools/${file}`,'utf8');assert.ok(!/\bfetch\s*\(|(?:localStorage|sessionStorage)\s*\.|sendBeacon|\beval\s*\(|new Function/.test(source),`${slug}: unsafe execution or transmission`);if(file!=='dataExposureModel.ts')assert.ok(!/URLSearchParams/.test(source),`${slug}: no private URL serialization`);}
}
console.log(`Browser pack audit passed: ${registered.length}/${additions.length} tools; ${tools.length} total; SEO, schemas, sitemap, llms, discovery and local-only implementation.`);
