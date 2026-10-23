// Dated official guidance, separate from any claim about a user's real pipeline.
export const provenanceMetadata = {
  verifiedAt:'2026-10-23', action:'actions/attest@v4', checkout:'actions/checkout@v6', upload:'actions/upload-artifact@v7',
  permissions:{contents:'read', 'id-token':'write', attestations:'write'},
  predicates:{provenance:'https://slsa.dev/provenance/v1', spdx:'https://spdx.dev/Document/v2.3', cyclonedx:'https://cyclonedx.org/bom'},
  slsaVersion:'1.2',
  levels:[['Build L0','No provenance requirements.'],['Build L1','Provenance describes the build.'],['Build L2','A hosted build platform generates signed provenance.'],['Build L3','A hardened build platform protects against tampering during the build.']],
  availability:'Public repositories: current GitHub plans. Private/internal repositories require GitHub Enterprise Cloud. Legacy plans and GitHub Enterprise Server are not supported; confirm your entitlement.',
  transparency:'Public repositories use Sigstore’s public-good service with a public transparency log. Private/internal repositories use GitHub’s Sigstore service without that public log. Never put secrets in subjects or metadata.',
  sources:{
    github:'https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations',
    concepts:'https://docs.github.com/en/actions/concepts/security/artifact-attestations',
    action:'https://github.com/actions/attest/blob/v4/action.yml',
    cli:'https://cli.github.com/manual/gh_attestation_verify',
    release:'https://cli.github.com/manual/gh_release_create',
    reusable:'https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/increase-security-rating',
    lifecycle:'https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/manage-attestations',
    slsa:'https://slsa.dev/spec/v1.2/build-track-basics',
    cyclonedx:'https://github.com/in-toto/attestation/blob/main/spec/predicates/cyclonedx.md',
  },
};
export const provenanceChoices = {
  platform:{github:'GitHub Actions',generic:'Generic CI — architecture only'},
  visibility:{public:'Public',private:'Private / internal'},
  artifactType:{binary:'Binary',container:'Container image',package:'Package',archive:'Archive',installer:'Installer',manifest:'Manifest',other:'Other file'},
  release:{tags:'Tagged releases only',main:'Main branch',manual:'Manual release',every:'Every pushed build',custom:'Custom branch'},
  sbom:{none:'None',existing:'Already generated in source',generate:'Generate in workflow',external:'External step — command required'},
  sbomFormat:{cyclonedx:'CycloneDX JSON',spdx:'SPDX 2.3 JSON'},
  reusable:{none:'No',existing:'Existing vetted reusable workflow',create:'Create a reusable build workflow'},
  verification:{consumer:'Consumer only',ci:'CI verification',release:'Release verification',deployment:'Deployment gate',multiple:'CI / release + deployment',none:'None — not recommended'},
  environment:{none:'None',kubernetes:'Kubernetes',server:'Server / VM',package:'Package registry',container:'Container registry',custom:'Custom'},
  goal:{basic:'Basic provenance',signed:'Signed provenance',isolated:'Stronger isolated build',slsa:'SLSA-oriented build process'},
  publish:{artifact:'GitHub workflow artifact',release:'New GitHub release',external:'External publish command'},
  permissions:{scoped:'Required scopes only',broad:'Existing workflow has write-all',unknown:'Not reviewed'},
  subjectStage:{final:'Final distributable',intermediate:'Intermediate file — not ready to attest'},
} as const;
export type ProvenanceConfig = {[K in keyof typeof provenanceChoices]:keyof typeof provenanceChoices[K]} & {
  repository:string; owner:string; signerRepo:string; signerWorkflow:string; sourceRef:string;
  artifactPath:string; imageName:string; buildCommand:string; sbomPath:string; sbomCommand:string;
  publishCommand:string; deployCommand:string; branch:string; reusableRef:string;
};
export const provenanceArtifactNotes:Record<ProvenanceConfig['artifactType'],string>={
  binary:'Attest the final binary after all byte-changing signing or packaging steps.',
  container:'Use the pushed image digest, not a mutable tag. Generated registry integration targets GHCR.',
  package:'Attest the exact package archive consumers install. A source lockfile SBOM may not describe the packaged contents.',
  archive:'Create the archive first, then attest and distribute the same bytes without repackaging.',
  installer:'Finish installer generation and platform code signing before attestation.',
  manifest:'Attesting a manifest signs that file only; verify referenced artifact digests separately.',
  other:'Choose one final file. Package directories before attesting; later changes invalidate the subject identity.',
};
export const provenanceEnvironmentNotes:Record<ProvenanceConfig['environment'],string>={
  none:'Consumers must verify before use; no deployment integration is selected.',
  kubernetes:'Deploy the verified image by digest. A pipeline check is not cluster-wide enforcement; review an admission policy independently.',
  server:'Install the exact verified file bytes on the target host; do not rebuild or download another copy after the gate.',
  package:'Verify the exact package being promoted. Registry transformation or repacking requires a separately attested final subject.',
  container:'Promote and deploy the verified OCI digest; moving a tag does not preserve the trust decision.',
  custom:'Bind the deployment operation to the verified artifact identity and enforce the policy at the actual consumption boundary.',
};
export const provenanceDefaults:ProvenanceConfig={platform:'github',visibility:'public',artifactType:'binary',release:'tags',sbom:'none',sbomFormat:'cyclonedx',reusable:'none',verification:'release',environment:'none',goal:'signed',publish:'artifact',permissions:'scoped',subjectStage:'final',repository:'',owner:'',signerRepo:'',signerWorkflow:'',sourceRef:'',artifactPath:'',imageName:'',buildCommand:'',sbomPath:'',sbomCommand:'',publishCommand:'',deployCommand:'',branch:'main',reusableRef:''};
export const provenancePresets = {
  'Basic Starter':{verification:'consumer',goal:'basic',release:'manual'},
  'Public GitHub Release':{publish:'release',verification:'release',release:'tags'},
  'Container Image':{artifactType:'container',verification:'ci',environment:'container'},
  'Package Release':{artifactType:'package',verification:'release'},
  'Provenance + SBOM':{sbom:'generate',sbomFormat:'cyclonedx'},
  'Reusable SLSA-Oriented Build':{reusable:'create',goal:'slsa',verification:'ci'},
  'Deployment Gate':{verification:'deployment',environment:'server'},
} satisfies Record<string,Partial<ProvenanceConfig>>;
export type ProvenancePreset = keyof typeof provenancePresets;
export function provenancePreset(name:ProvenancePreset):ProvenanceConfig {return {...provenanceDefaults,...provenancePresets[name]};}
export type ProvenanceFinding={status:'FAIL'|'WARN'|'INFO'; title:string; action:string};
export type ProvenanceFile={name:string; text:string; kind:'yaml'|'markdown'};
const quote=(text:string)=>JSON.stringify(text); // YAML double-quoted scalar; no raw scalar interpolation.
const shellQuote=(text:string)=>`'${text.replace(/'/g,`'"'"'`)}'`;
const block=(text:string,indent=10)=>text.split('\n').map(line=>' '.repeat(indent)+line).join('\n');
const safeRepo=(text:string)=>/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/.test(text)&&!text.endsWith('/.')&&!text.endsWith('/..');
const safePath=(text:string)=>text.length<=300&&/^[A-Za-z0-9][A-Za-z0-9._/ -]*$/.test(text)&&!text.split('/').some(s=>s==='..'||s==='.'||!s);
const safeWorkflow=(text:string)=>/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+\/\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(text);
const safeRefName=(text:string)=>text.length<=150&&/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(text)&&!text.includes('..')&&!text.endsWith('.')&&text.split('/').every(part=>part&&!part.startsWith('.')&&!part.endsWith('.lock'));

export function buildProvenance(input:ProvenanceConfig) {
  const config={...input};
  for(const key of Object.keys(config) as (keyof ProvenanceConfig)[]){
    if(typeof config[key]!=='string'||config[key].length>6000)throw new Error('Configuration fields must be text, with at most 6,000 characters each.');
    // Normalize line endings only; commands remain verbatim inside YAML block scalars.
    const normalized=config[key].replace(/\r\n?/g,'\n');
    (config as Record<string,string>)[key]=key.endsWith('Command')?normalized:normalized.trim();
  }
  for(const key of Object.keys(provenanceChoices) as (keyof typeof provenanceChoices)[])if(!Object.hasOwn(provenanceChoices[key],config[key]))throw new Error('Choose a supported configuration option.');
  const c=config, findings:ProvenanceFinding[]=[];
  const add=(status:ProvenanceFinding['status'],title:string,action:string)=>findings.push({status,title,action});
  const container=c.artifactType==='container', github=c.platform==='github', sbom=c.sbom!=='none', verify=c.verification!=='none';
  const gate=['ci','release','deployment','multiple'].includes(c.verification), deploy=['deployment','multiple'].includes(c.verification);
  const reusable=c.reusable!=='none', existing=c.reusable==='existing';
  const refMatch=c.reusableRef.match(/^([^@]+)@([a-fA-F0-9]{40})$/);
  const actualSigner=existing?refMatch?.[1]:c.repository?`${c.repository}/.github/workflows/${reusable?'provenance-build':'provenance'}.yml`:'';
  const actualSignerRepo=actualSigner?.split('/').slice(0,2).join('/')||'';
  const signerWorkflow=c.signerWorkflow||actualSigner||'', signerRepo=c.signerRepo||actualSignerRepo;
  for(const [key,value] of Object.entries(c))if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)||value.includes('${{'))add('FAIL','Unsafe configuration text',`Remove control characters or GitHub expression interpolation from ${key}. Use explicit environment variables in commands; never paste secrets.`);
  if(github&&!existing&&!c.buildCommand.trim())add('FAIL','Build command missing','Enter the actual commands that build your final artifact. No command is inferred from the selected type.');
  if(!container&&!safePath(c.artifactPath))add(github?'FAIL':'WARN','Final artifact path required','Use one relative Ubuntu workspace file path, without globs, traversal or expressions. Directories must be packaged before attestation.');
  const imageParts=c.imageName.split('/');
  if(container&&github&&!(c.imageName.length<=300&&imageParts[0]==='ghcr.io'&&/^[a-z0-9][a-z0-9-]*$/.test(imageParts[1]||'')&&imageParts.length>=3&&imageParts.slice(2).every(p=>/^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$/.test(p))))add('FAIL','GHCR image identity required','Use a lowercase ghcr.io/owner/image name without a tag or digest. Other registries require an independently reviewed pipeline.');
  if(github&&verify&&!safeRepo(c.repository)&&!c.owner)add('FAIL','Verification trust scope missing','Set the expected artifact repository or organization. A signature alone is not a trust policy.');
  if(c.repository&&!safeRepo(c.repository))add('FAIL','Repository format invalid','Use owner/repository without a URL, ref or expression.');
  if(c.owner&&!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(c.owner))add('FAIL','Organization format invalid','Use a GitHub organization login only.');
  if(c.repository&&c.owner&&c.repository.split('/')[0].toLowerCase()!==c.owner.toLowerCase())add('FAIL','Repository and organization disagree','Choose one consistent artifact owner and repository.');
  if(c.signerRepo&&!safeRepo(c.signerRepo))add('FAIL','Signer repository invalid','Use owner/repository.');
  if(c.signerWorkflow&&!safeWorkflow(c.signerWorkflow))add('FAIL','Signer workflow invalid','Use owner/repository/.github/workflows/file.yml, without @ref.');
  if(signerRepo&&signerWorkflow&&!signerWorkflow.startsWith(`${signerRepo}/`))add('FAIL','Signer restrictions disagree','Use a signer repository matching the workflow repository.');
  if(github&&actualSigner&&signerWorkflow&&actualSigner!==signerWorkflow)add('FAIL','Policy would reject the generated signer','Match the trusted workflow to the generated workflow or selected reusable workflow.');
  if(c.sourceRef&&(!/^refs\/(heads|tags)\//.test(c.sourceRef)||!safeRefName(c.sourceRef.split('/').slice(2).join('/'))))add('FAIL','Source ref invalid','Use an explicit refs/heads/... or refs/tags/... ref.');
  if(['main','custom'].includes(c.release)&&!safeRefName(c.branch))add('FAIL','Branch filter invalid','Use a literal branch name without expressions or glob patterns.');
  if(c.subjectStage==='intermediate')add('FAIL','Subject is not the final artifact','Finish packaging or signing first. Attest exactly the bytes that consumers will receive.');
  if(existing&&(!refMatch||!safeWorkflow(refMatch[1])))add('FAIL','Reusable workflow must be pinned','Provide owner/repo/.github/workflows/build.yml@ followed by a reviewed 40-character commit SHA.');
  if(existing)add('WARN','Existing reusable contract is unverified','The caller passes no commands, arbitrary inputs or inherited secrets. Confirm the vetted callee builds, attests, publishes and enforces the selected plan with its own fixed implementation.');
  if(existing&&verify&&!signerWorkflow)add('FAIL','Reusable signer policy missing','Set a valid pinned reusable workflow so consumer verification can restrict its actual signer.');
  if(sbom){
    if(!safePath(c.sbomPath))add('FAIL','SBOM source path missing','Provide a relative JSON SBOM file describing this exact artifact.');
    if(!container&&c.sbomPath===c.artifactPath)add('FAIL','SBOM and artifact paths are identical','Keep the subject artifact and its SBOM as separate files.');
    if(['generate','external'].includes(c.sbom)&&!c.sbomCommand.trim()&&!existing)add('FAIL','SBOM generation step missing','Supply your established generator or download step. This tool does not invent, install or run an SBOM generator.');
    add('INFO','SBOM is a separate claim',`The action reads the JSON SBOM format; the consumer must require the ${c.sbomFormat==='spdx'?'SPDX 2.3':'CycloneDX'} predicate separately. No format or component completeness is verified here.`);
  }
  if(!verify)add(['isolated','slsa'].includes(c.goal)?'FAIL':'WARN','No verification selected','Select a consumer or pipeline verification stage. Unconsumed attestations do not enforce a policy.');
  if(verify&&!signerWorkflow)add('WARN','Workflow identity not restricted','Organization-only verification can accept other workflows. Supply the build repository or an explicit approved signer workflow.');
  if(c.permissions==='broad')add('WARN','Replace existing write-all permissions','Merge only the generated job-level scopes. Remove write-all rather than layering permissions on top.');
  if(c.permissions==='unknown')add('WARN','Existing permissions need review','Inspect the destination workflow. The generated plan does not grant unselected scopes.');
  if(c.visibility==='private')add('WARN','Private/internal entitlement required',provenanceMetadata.availability);
  if(c.release==='every')add('WARN','Attesting every pushed build','Use this only for outputs consumers actually verify; avoid disposable test artifacts.');
  if(container)add('INFO','Container publication precedes registry attestation','This generated path supports GHCR. The build must produce $IMAGE_NAME:$GITHUB_SHA. Push records its actual digest, then registry attestations and verification follow. A gate protects consumption/deployment, not the initial registry push.');
  if(!container&&c.publish==='external'&&!c.publishCommand.trim()&&!existing)add('FAIL','Publish command missing','Enter the real publishing command or use GitHub workflow artifact storage. No package-registry behavior is inferred.');
  if(!container&&c.publish==='release'&&c.release!=='tags')add('WARN','Release publication requires a tag','The generated publish step fails unless GITHUB_REF_TYPE is tag. Existing releases are not overwritten.');
  if(deploy&&!c.deployCommand.trim()&&!existing)add('WARN','Deployment is not configured','Verification is generated, but no deployment command is exported. Add the actual deployment operation and its narrowly scoped credentials yourself.');
  if(['isolated','slsa'].includes(c.goal))add('WARN','No hardened-build level established','A reusable workflow is not sufficient by itself. Assess isolation, caller influence, trusted code, dependency controls and the actual build platform against SLSA 1.2.');
  add('INFO','Review action pins and external execution','Official major-version actions are dated examples. Pin reviewed full commit SHAs for a hardened rollout. Commands are supplied by you, exported as shell code and never executed here.');
  const permissions:Record<string,string>=github?{...provenanceMetadata.permissions,...(container?{packages:'write'}:{}),...(!container&&c.publish==='release'?{contents:'write'}:{})}:{};
  const steps=['Source',...(reusable?['Vetted reusable build']:['Build']),container?'Final local image':'Final file',...(sbom?['SBOM source']:[]),...(container?['Push image; capture digest']:[]),'Signed provenance',...(sbom?['Separate SBOM attestation']:[]),...(!container?['Publish same bytes']:[]),...(verify?['Consumer verifies identity + digest + predicate']:[]),...(deploy?['Verification gate → deploy unchanged artifact']:[])];
  const readiness=github?'Planned signed hosted provenance supports Build L2 characteristics; no achieved level is verified.':'Generic CI plan: establish automatic provenance for Build L1, then signed hosted provenance for Build L2.';
  const nextLevel=reusable?'For Build L3, independently assess platform hardening, isolation and whether caller-controlled inputs can influence the trusted builder.':'For stronger isolation, use a vetted reusable builder with fixed build/signing logic, restrict its identity and assess platform hardening.';
  const policy=[
    'Verify the exact downloaded file bytes or expected immutable OCI digest; do not repackage after attestation.',
    `Require repository ${c.repository||'(not set)'}${c.owner?` in organization ${c.owner}`:''}; an organization-wide scope is broader than a repository.`,
    `Require signer workflow ${signerWorkflow||'(not set — review required)'}${signerRepo?` from ${signerRepo}`:''}.`,
    ...(c.sourceRef?[`Require source ref ${c.sourceRef}; a branch/tag ref is mutable and does not replace a trusted commit policy.`]:[]),
    `Require provenance predicate ${provenanceMetadata.predicates.provenance}.`,
    ...(sbom?[`Also require a separate SBOM predicate ${provenanceMetadata.predicates[c.sbomFormat]}; compare the SBOM to the actual distribution.`]:[]),
    'Fail closed on verification or policy errors. Deploy/use the exact artifact that passed; do not switch back to a mutable image tag.',
    provenanceEnvironmentNotes[c.environment],
    'Record verification evidence and apply independent vulnerability, authorization and release-review controls.',
  ];
  const trustFlags=[c.repository?`--repo ${shellQuote(c.repository)}`:c.owner?`--owner ${shellQuote(c.owner)}`:'',signerRepo?`--signer-repo ${shellQuote(signerRepo)}`:'',signerWorkflow?`--signer-workflow ${shellQuote(signerWorkflow)}`:'',c.sourceRef?`--source-ref ${shellQuote(c.sourceRef)}`:'',...(['isolated','slsa'].includes(c.goal)?['--deny-self-hosted-runners']:[])].filter(Boolean).join(' ');
  const verifyCommands=(subject:string)=>[`${'gh attestation verify'} ${subject} ${trustFlags} --predicate-type ${shellQuote(provenanceMetadata.predicates.provenance)}`,...(sbom?[`gh attestation verify ${subject} ${trustFlags} --predicate-type ${shellQuote(provenanceMetadata.predicates[c.sbomFormat])}`]:[])].join('\n');
  const hardFailures=findings.some(f=>f.status==='FAIL');
  const verification=buildVerification();
  function buildVerification(){
    if(!github)return 'Generic CI: use your provider’s documented verifier. Require the expected builder identity, artifact digest and predicate; fail closed before use. No provider-specific command is invented.';
    if(hardFailures)return 'Resolve FAIL findings before generating executable verification commands.';
    if(!verify)return 'Verification is disabled in this plan. Select a verification stage before relying on provenance.';
    if(!trustFlags)return 'Set an expected repository or organization before generating verification commands.';
    return (container?': "${EXPECTED_DIGEST:?Set the trusted release digest, including sha256:}"\n':'')+verifyCommands(container?`"oci://${c.imageName}@\${EXPECTED_DIGEST}"`:shellQuote(c.artifactPath));
  }
  const files:ProvenanceFile[]=[];
  const permissionYaml=(indent:number)=>Object.entries(permissions).map(([key,value])=>' '.repeat(indent)+`${key}: ${value}`).join('\n');
  const trigger=c.release==='tags'?'  push:\n    tags: ["v*"]':c.release==='every'?'  push: {}':c.release==='manual'?'  workflow_dispatch: {}':`  push:\n    branches: [${quote(c.branch)}]`;
  const header=`# Generated locally; review commands, permissions and action pins before use.\nname: Software provenance\non:\n${trigger}\npermissions: {}\njobs:\n`;
  if(github&&!hardFailures){
    if(existing){
      files.push({name:'provenance.yml',kind:'yaml',text:header+`  trusted-build:\n    permissions:\n${permissionYaml(6)}\n    uses: ${quote(c.reusableRef)}\n# The selected callee owns build, attest, publish and verification implementation.\n# No arbitrary caller inputs or secrets: inherit. Review its contract independently.\n`});
    }else{
      const body:string[]=[`  build:\n    runs-on: ubuntu-latest\n    permissions:\n${permissionYaml(6)}`];
      const env:Record<string,string>=container?{IMAGE_NAME:c.imageName}:{ARTIFACT_PATH:c.artifactPath};
      if(sbom)env.SBOM_PATH=c.sbomPath;
      body.push('    env:',...Object.entries(env).map(([key,value])=>`      ${key}: ${quote(value)}`),'    steps:',`      - name: Checkout trusted source\n        uses: ${provenanceMetadata.checkout}\n        with:\n          persist-credentials: false`);
      if(container)body.push(`      - name: Authenticate to GHCR\n        env:\n          GH_TOKEN: \${{ github.token }}\n        run: echo "$GH_TOKEN" | docker login ghcr.io --username "$GITHUB_ACTOR" --password-stdin`);
      body.push(`      - name: Build final artifact\n        shell: bash\n        run: |2-\n${block(c.buildCommand)}`);
      if(sbom&&['generate','external'].includes(c.sbom))body.push(`      - name: Produce SBOM for this artifact\n        shell: bash\n        run: |2-\n${block(c.sbomCommand)}`);
      if(container)body.push(`      - name: Push image and capture immutable identity\n        id: image\n        shell: bash\n        run: |\n          docker push "$IMAGE_NAME:$GITHUB_SHA"\n          digest="$(docker image inspect "$IMAGE_NAME:$GITHUB_SHA" --format '{{json .RepoDigests}}' | jq -er --arg prefix "$IMAGE_NAME@" 'map(select(startswith($prefix))) | first | split("@")[1]')"\n          [[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]]\n          echo "digest=$digest" >> "$GITHUB_OUTPUT"`);
      else body.push('      - name: Require the final distributable file\n        shell: bash\n        run: test -f "$ARTIFACT_PATH" && test ! -L "$ARTIFACT_PATH"');
      if(sbom)body.push('      - name: Require the JSON SBOM file\n        shell: bash\n        run: test -f "$SBOM_PATH" && jq -e . "$SBOM_PATH" > /dev/null');
      const subject=container?'          subject-name: ${{ env.IMAGE_NAME }}\n          subject-digest: ${{ steps.image.outputs.digest }}\n          push-to-registry: true\n          create-storage-record: false':'          subject-path: ${{ env.ARTIFACT_PATH }}';
      body.push(`      - name: Attest build provenance\n        uses: ${provenanceMetadata.action}\n        with:\n${subject}`);
      if(sbom)body.push(`      - name: Attest SBOM separately\n        uses: ${provenanceMetadata.action}\n        with:\n${subject}\n          sbom-path: \${{ env.SBOM_PATH }}`);
      if(gate)body.push(`      - name: Verify artifact and selected predicates before use\n        env:\n          GH_TOKEN: \${{ github.token }}${container?'\n          VERIFIED_DIGEST: ${{ steps.image.outputs.digest }}':''}\n        shell: bash\n        run: |\n${block(verifyCommands(container?'"oci://$IMAGE_NAME@$VERIFIED_DIGEST"':'"$ARTIFACT_PATH"'))}`);
      if(!container){
        if(c.publish==='artifact')body.push(`      - name: Publish the same file without repackaging\n        uses: ${provenanceMetadata.upload}\n        with:\n          path: \${{ env.ARTIFACT_PATH }}\n          archive: false\n          if-no-files-found: error`);
        if(c.publish==='release')body.push('      - name: Publish a new tagged release\n        env:\n          GH_TOKEN: ${{ github.token }}\n        shell: bash\n        run: |\n          test "$GITHUB_REF_TYPE" = tag\n          gh release create "$GITHUB_REF_NAME" "$ARTIFACT_PATH" --repo "$GITHUB_REPOSITORY" --verify-tag --title "$GITHUB_REF_NAME" --notes "Build provenance is available through GitHub artifact attestations."');
        if(c.publish==='external')body.push(`      - name: Publish unchanged artifact\n        shell: bash\n        run: |2-\n${block(c.publishCommand)}`);
      }
      if(deploy&&c.deployCommand.trim())body.push(`      - name: Deploy only the verified artifact\n${container?'        env:\n          VERIFIED_IMAGE: ${{ env.IMAGE_NAME }}@${{ steps.image.outputs.digest }}\n':''}        shell: bash\n        run: |2-\n${block(c.deployCommand)}`);
      const build=body.join('\n')+'\n';
      if(reusable){
        files.push({name:'provenance-build.yml',kind:'yaml',text:'# Vetted builder template: fixed commands; no caller-controlled command inputs.\nname: Reusable provenance build\non:\n  workflow_call: {}\npermissions: {}\njobs:\n'+build});
        files.push({name:'provenance.yml',kind:'yaml',text:header+`  trusted-build:\n    permissions:\n${permissionYaml(6)}\n    uses: ./.github/workflows/provenance-build.yml\n# Same-repository reuse is not proof of isolation or Build L3.\n`});
      }else files.push({name:'provenance.yml',kind:'yaml',text:header+build});
    }
  }
  const guide=`# Software provenance verification plan\n\nLocal planning output, not a signed attestation, security assessment or achieved SLSA level.\n\n## Architecture\n${steps.map((step,i)=>`${i+1}. ${step}`).join('\n')}\n\n${provenanceArtifactNotes[c.artifactType]}\n\n## Consumer verification\n${verification}\n\nRun the commands yourself after obtaining the exact artifact from a trusted release channel. GitHub CLI needs authentication, a recent version supporting these flags and network access to fetch attestations. OCI verification also needs registry access. Toolooo makes no such request.\n\n## Accept only if\n${policy.map(p=>`- ${p}`).join('\n')}\n\n## SLSA ${provenanceMetadata.slsaVersion} readiness\n${readiness}\n${nextLevel}\n\n## Review findings\n${findings.map(f=>`- ${f.status}: ${f.title}. ${f.action}`).join('\n')}\n\n## Availability and privacy\n${provenanceMetadata.availability}\n${provenanceMetadata.transparency}\n\n## Release and retention\nAttest outputs that consumers will verify, not every disposable test file. Consider immutable releases to reduce artifact/tag mutation risk. Publish the exact attested bytes; package/installer signing must finish first. Retain verification evidence and attestations for the supported artifact lifetime. Deleting attestations can break consumers; no automatic deletion policy is generated.\n\n## Trust boundary\nProvenance describes where/how an artifact was built; an SBOM describes its components. Neither proves absence of vulnerabilities or malicious code. Attestations can support supply-chain due diligence; no regulatory compliance is established. User commands are not inspected for all unsafe behavior. External publish/deploy steps must preserve the verified subject identity.\n\n## References (reviewed ${provenanceMetadata.verifiedAt})\n${Object.entries(provenanceMetadata.sources).map(([name,url])=>`- ${name}: ${url}`).join('\n')}\n`;
  files.push({name:'provenance-verification.md',kind:'markdown',text:guide});
  return {config,findings,permissions,steps,readiness,nextLevel,policy,verification,files,workflowReady:github&&!hardFailures,summary:!github?'Generic CI architecture only — no provider workflow generated.':hardFailures?'Configuration incomplete — fix FAIL findings before exporting YAML.':existing?'Caller template ready for review — the existing builder contract is unverified.':'Workflow plan generated — review and test it in your own pipeline.'};
}
