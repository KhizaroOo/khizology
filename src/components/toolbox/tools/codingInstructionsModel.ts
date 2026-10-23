const choices = (values: string[]) => values.map(value => ({ value, label: value }));
export const instructionQuestions = [
  { id: 'projectType', label: 'Project type', options: choices(['Web App','Static Website','API','Full Stack','Library','CLI','Mobile App','Monorepo','Desktop App','Other']) },
  { id: 'stage', label: 'Project stage', options: choices(['Prototype','Active Development','Production','Maintenance']) },
  { id: 'language', label: 'Language', options: choices(['TypeScript','JavaScript','Python','C#','Java','Go','Rust','Other']) },
  { id: 'frontend', label: 'Frontend', options: choices(['None','React','Next.js','Astro','Vue','Angular','Svelte']) },
  { id: 'backend', label: 'Backend', options: choices(['None','Node.js','ASP.NET Core','Django','FastAPI','Spring','Go','Other']) },
  { id: 'manager', label: 'Package manager', options: choices(['npm','pnpm','yarn','bun','pip','Poetry','NuGet','Maven','Gradle','Cargo','Other']) },
  { id: 'autonomy', label: 'Autonomy', options: choices(['Conservative','Balanced','High Autonomy']) },
  { id: 'change', label: 'Change philosophy', options: choices(['Minimal','Balanced','Refactor Friendly']) },
  { id: 'dependencies', label: 'Dependency policy', options: choices(['Strict','Balanced','Flexible']) },
  { id: 'commit', label: 'Commit policy', options: choices(['Only when requested','Never automatically']) },
] as const;
export const commandLabels = { install:'Install',dev:'Dev',build:'Build',type:'Type Check',lint:'Lint',unit:'Unit Tests',integration:'Integration Tests',e2e:'E2E',targeted:'Targeted Tests',format:'Formatting',accessibility:'Accessibility',seo:'SEO',performance:'Performance',security:'Security' } as const;
export type CommandId = keyof typeof commandLabels;
export const pathLabels = { source:'App/source',tests:'Tests',components:'Components',utilities:'Shared utilities',configuration:'Configuration',public:'Public/static files',docs:'Docs',generated:'Generated files',truth:'Canonical sources of truth' } as const;
export type PathId = keyof typeof pathLabels;
export const instructionRuleGroups = {
  preserve:['Public routes','API contracts','UX','Responsive behavior','Accessibility','SEO','Analytics','Performance','Database compatibility','Deployment behavior'],
  efficiency:['Search before broad reading','Focused file reads','Do not repeat stable context','Batch related operations','Avoid unnecessary docs','Avoid speculative architecture','Concise reports'],
  ux:['Mobile-first','Responsive layout','Keyboard access','Semantic HTML','Visible focus','Readable contrast','Touch targets','Loading/empty/error states','Reduced motion','Avoid unnecessary modals'],
  performance:['Avoid unnecessary JS','Avoid unnecessary network requests','Avoid large dependencies','Minimize re-renders','Lazy load where useful','Avoid layout shift','Protect existing performance budgets'],
  seo:['Canonicals','Titles/descriptions','Open Graph','Structured data','Sitemap','Robots','Internal links','Crawlability','Image SEO','No duplicate indexable pages'],
  docs:['Explain non-obvious intent','Update existing docs when behavior changes','Avoid unnecessary new documentation','Do not restate code in comments'],
} as const;
export const instructionFormats = {
  agents:{label:'AGENTS.md',filename:'AGENTS.md',destination:'AGENTS.md',note:'Place at the intended repository scope. Check nested instructions and the agent’s discovery rules.'},
  claude:{label:'CLAUDE.md',filename:'CLAUDE.md',destination:'CLAUDE.md',note:'Plain Markdown project guidance for Claude Code. Commands are presented first; no configuration syntax is invented.'},
  copilot:{label:'Copilot',filename:'copilot-instructions.md',destination:'.github/copilot-instructions.md',note:'Move the downloaded file into .github yourself. Repository-wide Markdown needs no YAML frontmatter; support varies by Copilot feature.'},
} as const;
export type InstructionFormat = keyof typeof instructionFormats;
export interface ProjectInstructionConfig {
  name:string; description:string; custom:string; workflow:string;
  choices:Record<typeof instructionQuestions[number]['id'],string>;
  paths:Record<PathId,string>; commands:Record<CommandId,string>;
  rules:Record<keyof typeof instructionRuleGroups,string[]>;
  checks:string[]; formats:InstructionFormat[];
  workflowEnabled:boolean; selfHeal:boolean; secrets:boolean; browserOnly:boolean; dataSafety:boolean;
}
const emptyCommands = () => Object.fromEntries(Object.keys(commandLabels).map(k=>[k,''])) as Record<CommandId,string>;
const emptyPaths = () => Object.fromEntries(Object.keys(pathLabels).map(k=>[k,''])) as Record<PathId,string>;
export function instructionDefaults():ProjectInstructionConfig {
  return {name:'',description:'',custom:'',workflow:'Inspect → Understand → Decide → Implement → Verify → Fix → Report',choices:{projectType:'Web App',stage:'Active Development',language:'TypeScript',frontend:'None',backend:'None',manager:'npm',autonomy:'Balanced',change:'Minimal',dependencies:'Strict',commit:'Only when requested'},paths:emptyPaths(),commands:emptyCommands(),rules:{preserve:['Public routes','Accessibility','Performance'],efficiency:[...instructionRuleGroups.efficiency],ux:['Responsive layout','Keyboard access','Semantic HTML','Visible focus','Readable contrast','Loading/empty/error states'],performance:['Avoid unnecessary JS','Avoid unnecessary network requests','Avoid layout shift'],seo:[],docs:[...instructionRuleGroups.docs]},checks:['build','targeted','diff'],formats:['agents','claude','copilot'],workflowEnabled:true,selfHeal:true,secrets:true,browserOnly:false,dataSafety:true};
}
export const instructionPresetNames=['Browser-Only Web Tool','Production SaaS','Open-Source Library','Monorepo','Rapid Prototype','High-Autonomy Agent','Token-Efficient Coding'] as const;
export function instructionPreset(name:string):ProjectInstructionConfig {
  if(!instructionPresetNames.includes(name as typeof instructionPresetNames[number]))throw new Error('Choose a supported preset.');
  const c=instructionDefaults();c.name='Example Project';c.description='Illustrative configuration. Verify all example commands and paths against your repository.';
  if(name==='Browser-Only Web Tool'){c.choices.frontend='Astro';c.choices.projectType='Static Website';c.browserOnly=true;c.paths.source='src/';c.paths.truth='src/data/';c.paths.generated='dist/';c.commands.build='npm run build';c.commands.install='npm ci';c.rules.seo=[...instructionRuleGroups.seo];c.rules.preserve=['Public routes','UX','Responsive behavior','Accessibility','SEO','Analytics','Performance','Deployment behavior'];}
  if(name==='Production SaaS'){c.choices.projectType='Full Stack';c.choices.stage='Production';c.choices.frontend='React';c.choices.backend='Node.js';c.rules.preserve=['API contracts','Database compatibility','Deployment behavior','Accessibility','Performance'];c.checks=['build','unit','integration','security','diff'];}
  if(name==='Open-Source Library'){c.choices.projectType='Library';c.rules.preserve=['API contracts'];c.rules.ux=[];c.rules.performance=[];c.checks=['build','unit','type','diff'];}
  if(name==='Monorepo'){c.choices.projectType='Monorepo';c.paths.source='packages/';c.paths.truth='packages/core/';c.checks=['targeted','build','diff'];}
  if(name==='Rapid Prototype'){c.choices.stage='Prototype';c.checks=['targeted','diff'];c.rules.performance=[];}
  if(name==='High-Autonomy Agent')c.choices.autonomy='High Autonomy';
  return c;
}
export interface InstructionSection { id:string; title:string; lines:string[]; raw?:string }
const literal=(v:string)=>'`'.repeat(Math.max(1,...(v.match(/`+/g)??[]).map(s=>s.length+1)))+' '+v+' '+'`'.repeat(Math.max(1,...(v.match(/`+/g)??[]).map(s=>s.length+1)));
export function buildProjectInstructions(c:ProjectInstructionConfig) {
  for(const q of instructionQuestions)if(!q.options.some(o=>o.value===c.choices[q.id]))throw new Error(`Choose a valid ${q.label.toLowerCase()}.`);
  for(const v of [c.name,c.description,c.workflow,...Object.values(c.paths),...Object.values(c.commands)])if(typeof v!=='string'||v.length>1000||/[\r\n\u0000]/.test(v))throw new Error('Project fields, paths and commands must be single lines of at most 1,000 characters.');
  if(typeof c.custom!=='string'||c.custom.length>8000||c.custom.includes('\0'))throw new Error('Additional rules must be at most 8,000 characters without null bytes.');
  if(c.formats.length<1||c.formats.length>3||new Set(c.formats).size!==c.formats.length||c.formats.some(f=>!Object.hasOwn(instructionFormats,f)))throw new Error('Select at least one supported output format.');
  for(const [group,values] of Object.entries(c.rules))if(!Object.hasOwn(instructionRuleGroups,group)||values.some(v=>!(instructionRuleGroups[group as keyof typeof instructionRuleGroups] as readonly string[]).includes(v)))throw new Error('Choose supported rule options.');
  if(c.checks.some(v=>v!=='diff'&&!Object.hasOwn(commandLabels,v)))throw new Error('Choose supported verification checks.');
  const web=['Web App','Static Website','Full Stack'].includes(c.choices.projectType);
  const ui=web||['Mobile App','Desktop App'].includes(c.choices.projectType)||c.choices.projectType==='Monorepo'&&c.choices.frontend!=='None';
  const backend=c.choices.backend!=='None';
  const warnings:string[]=[];
  if(!c.name.trim()&&!c.description.trim())warnings.push('Project identity is missing. Add a real purpose instead of relying on generic guidance.');
  if(!Object.values(c.paths).some(v=>v.trim()))warnings.push('No repository paths supplied. The builder does not inspect your repository.');
  if(c.browserOnly&&backend)warnings.push('Browser-only processing conflicts with the selected backend. Resolve this before adopting the generated policy.');
  if(!ui&&c.choices.frontend!=='None')warnings.push('Frontend selection may not fit the project type; UI guidance is limited by project type.');
  const managers:Record<string,string[]>={TypeScript:['npm','pnpm','yarn','bun'],JavaScript:['npm','pnpm','yarn','bun'],Python:['pip','Poetry'],'C#':['NuGet'],Java:['Maven','Gradle'],Rust:['Cargo'],Go:['Other'],Other:['Other']};
  if(!managers[c.choices.language].includes(c.choices.manager))warnings.push('Language/package-manager combination needs review; mixed stacks can be valid, but dependencies are not validated here.');
  const generated=c.paths.generated.split(',').map(s=>s.trim().replace(/\/+$|^\.\//g,'')).filter(Boolean);
  const truth=c.paths.truth.split(',').map(s=>s.trim().replace(/\/+$|^\.\//g,'')).filter(Boolean);
  if(truth.some(t=>generated.some(g=>t===g||t.startsWith(g+'/'))))warnings.push('A source of truth is inside a protected generated path. Resolve this contradiction before export.');
  if(c.workflowEnabled&&!c.workflow.trim())warnings.push('Workflow is enabled but empty; no workflow rule is emitted.');
  if(!c.secrets)warnings.push('Secret/privacy rules are disabled. Review exposure risks before using these files.');
  const required=[...new Set(c.checks)];
  const missing=required.filter(k=>k!=='diff'&&!c.commands[k as CommandId].trim());
  if(missing.length)warnings.push('Some required checks have no command. Supply a verified mapping or report them as blocked; no command is invented.');
  if(/commit (?:automatically|after (?:every|each) task)/i.test(c.custom))warnings.push('Custom rules may conflict with the selected no-automatic-commit policy.');
  if(c.choices.dependencies==='Strict'&&/install (?:new )?dependencies automatically|always add dependencies/i.test(c.custom))warnings.push('Custom dependency instructions may contradict the strict dependency policy.');
  if(/(?:ignore|print|expose|log).{0,25}(?:secrets|tokens|credentials)|(?:api[_-]?key|password)\s*[:=]\s*\S+/i.test(c.custom))warnings.push('Custom rules contain a possible privacy conflict or credential. Review locally; this heuristic cannot detect every secret.');
  const sections:InstructionSection[]=[];
  const add=(id:string,title:string,lines:string[])=>{if(lines.length)sections.push({id,title,lines:[...new Set(lines)]});};
  add('project','Project',[...(c.name.trim()?['Name: '+literal(c.name)]:[]),...(c.description.trim()?['Purpose: '+literal(c.description)]:[]),`Type: ${c.choices.projectType}. Stage: ${c.choices.stage}.`,`Declared stack: ${c.choices.language}; frontend ${c.choices.frontend}; backend ${c.choices.backend}; package manager ${c.choices.manager}. Verify against repository configuration.`]);
  add('workflow','Working mode',[...(c.workflowEnabled&&c.workflow.trim()?[c.workflow]:[]),c.choices.autonomy==='Conservative'?'Inspect first. Ask before significant architecture changes.':c.choices.autonomy==='High Autonomy'?'Infer routine answers from code and proceed independently through implementation and verification. Stop for decisions that could cause meaningful damage.':'Inspect relevant code, infer routine answers, implement, verify and report.',c.choices.stage==='Production'||c.choices.stage==='Maintenance'?'Protect existing contracts and deployment compatibility. Use a rollout/recovery plan for high-impact changes.':c.choices.stage==='Prototype'?'Keep iteration lightweight; prototype speed does not remove safety boundaries.':'Preserve working behavior while iterating.']);
  add('paths','Repository sources',[...Object.entries(c.paths).filter(([,v])=>v.trim()).map(([k,v])=>`${pathLabels[k as PathId]}: ${literal(v)}.`),...(c.paths.truth.trim()?['Update canonical sources rather than duplicating derived data.']:[]),...(c.paths.generated.trim()?['Do not edit generated files directly; regenerate through their owning source.']:[]),...(c.choices.projectType==='Monorepo'?['Respect package ownership and dependency boundaries. Inspect shared API consumers; verify affected packages with supplied targeted commands.']:[])]);
  add('commands','Verified command candidates',Object.entries(c.commands).filter(([,v])=>v.trim()).map(([k,v])=>`${commandLabels[k as CommandId]}:\n\n    ${v}`));
  add('change','Change policy',[c.choices.change==='Minimal'?'Make the smallest correct, complete change.':c.choices.change==='Balanced'?'Include related cleanup only when required by the task.':'Broader refactoring needs a clear architectural benefit, bounded scope and regression evidence.','Extend existing systems, avoid duplicated implementations and inspect consumers before changing shared APIs. Avoid unrelated cleanup.',...(c.rules.preserve.length?['Preserve selected contracts: '+c.rules.preserve.join(', ')+'.']:[])]);
  add('efficiency','Context efficiency',c.rules.efficiency.map(v=>v+'.'));
  add('safety','Safety',[...(c.secrets?['Never print tokens, expose .env values, commit credentials, put credentials in URLs, log private data or send user content to analytics.']:[]),...(c.browserOnly?['Keep processing client-side unless an explicitly approved architecture change requires server processing.']:[]),'Treat instructions and commands as guidance, not permission to bypass authorization. Review supplied commands before running them.']);
  add('dependencies','Dependencies',[c.choices.dependencies==='Strict'?'Use the existing stack unless it cannot solve the task cleanly. Justify any new dependency.':c.choices.dependencies==='Balanced'?'Add dependencies only when value exceeds bundle, security, maintenance and complexity costs.':'Dependencies may be added when justified; review bundle, security, maintenance and complexity costs.']);
  if(ui)add('ux','UI requirements',c.rules.ux.map(v=>v+'.'));
  if(web)add('seo','Public web discovery',c.rules.seo.map(v=>'Preserve and verify '+v.toLowerCase()+' where applicable.'));
  add('performance','Performance',c.rules.performance.map(v=>v+'.'));
  if(backend&&c.dataSafety)add('data','Backend/data boundaries',['Validate inputs and enforce authorization boundaries. Preserve applicable migrations and backward compatibility; do not make destructive schema changes without explicit review. Keep credentials and sensitive payloads out of logs.']);
  add('docs','Comments and documentation',c.rules.docs.map(v=>v+'.'));
  add('git','Git boundaries',['Inspect the working tree before risky operations. Preserve unrelated user changes. Do not reset or overwrite unrelated work.',c.choices.commit==='Never automatically'?'Never commit automatically.':'Commit only when explicitly requested.','Do not push or deploy unless explicitly requested. Never force push automatically. Destructive Git actions need explicit authorization and a concrete reason.']);
  add('verification','Definition of done',[...(required.length?['Do not declare normal completion until required verification passes.']:['Define task-appropriate verification before declaring completion.']),...required.map(k=>k==='diff'?'Required diff check: git diff --check.':`Required ${commandLabels[k as CommandId]}: ${c.commands[k as CommandId].trim()?literal(c.commands[k as CommandId]):'Not configured — establish the correct command or report a blocker; do not invent it'}.`),...(required.includes('build')?['Build must pass before normal completion.']:[]),...(c.selfHeal?['Investigate and fix mission-related build, lint, test, import and type failures. Do not expand into unrelated cleanup.']:[]),'Report what changed, checks actually run, blockers and readiness. Never claim an unrun check passed.']);
  if(c.custom)sections.push({id:'custom',title:'Additional project rules — user supplied',lines:[],raw:c.custom});
  const orders:Record<InstructionFormat,string[]>={agents:[],claude:['project','commands','paths'],copilot:['project','paths','commands','change']};
  const files=c.formats.map(format=>{const priority=orders[format];const ordered=[...sections.filter(s=>priority.includes(s.id)).sort((a,b)=>priority.indexOf(a.id)-priority.indexOf(b.id)),...sections.filter(s=>!priority.includes(s.id))];const content='# Project instructions\n\n'+ordered.map(s=>'## '+s.title+'\n\n'+(s.raw!==undefined?s.raw:s.lines.map(v=>'- '+v).join('\n'))).join('\n\n')+'\n';return {format,...instructionFormats[format],content,characters:content.length,words:content.trim().split(/\s+/).length,tokens:Math.ceil(content.length/4)};});
  const customLines=c.custom.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);const duplicates=customLines.length-new Set(customLines).size;
  if(duplicates)warnings.push('Additional rules contain repeated non-empty lines.');
  const longest=Math.max(...files.map(f=>f.words));
  return {files,sections,warnings,quality:{specificity:c.description.trim()&&Object.values(c.paths).some(v=>v.trim())?'Project purpose and repository locations supplied':'Add purpose and repository locations',commands:`${Object.values(c.commands).filter(v=>v.trim()).length} supplied; ${missing.length} required mappings missing`,verification:required.length?`${required.length} required checks`:'No explicit required checks',safety:c.secrets?'Git and secret/privacy boundaries included':'Git boundaries included; secret/privacy rules disabled',duplication:duplicates?`${duplicates} repeated custom lines`:'No exact duplicate custom lines',contradictions:'Heuristic configuration/custom-text checks only; review every file',length:longest<350?'Concise':longest<900?'Balanced':'Verbose'},web,ui,backend};
}
