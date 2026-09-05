import { useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import Insight from '../shared/Insight';
import Metric from '../shared/Metric';
import PresetBar from '../shared/PresetBar';
import ResultPanel from '../shared/ResultPanel';
import Warning from '../shared/Warning';
import { copyText, downloadJSON } from '../shared/exportHelpers';
import {
  ENVIRONMENT_LIMITS,
  compareEnvironments,
  isEnvironmentWithinSizeLimit,
  maskedEnvironmentPreview,
  missingKeyChecklist,
  parseEnvironment,
  sanitizedEnvironmentComparison,
  type ApparentValueType,
  type EnvironmentCell,
  type EnvironmentComparison,
  type EnvironmentRow,
} from './environmentDriftModel';

const ACCENT = '#F7933C';
const GOOD = '#22c55e';
const DANGER = '#ef4444';
const DEFAULT_NAMES = ['Development', 'Staging', 'Production'];
const TYPE_LABEL: Record<ApparentValueType, string> = { empty: 'empty', boolean: 'boolean', number: 'number', url: 'URL-like', string: 'string' };

const DRIFT_EXAMPLE = [
  '# Development — example values only\nAPP_ENV=development\nAPI_BASE_URL=http://localhost:3000\nREDIS_URL=redis://localhost:6379\nFEATURE_CHECKOUT=true\nWORKER_COUNT=2\nPAYMENT_MODE=sandbox\nPAYMENT_KEY="dev-example-only"\nLOG_LEVEL=debug',
  '# Staging — a missed key and a parsing mismatch\nAPP_ENV=staging\nAPI_BASE_URL=https://staging.example.test\nFEATURE_CHECKOUT=true\nWORKER_COUNT="two"\nPAYMENT_MODE=sandbox\nPAYMENT_KEY="stage-example-only"\nLOG_LEVEL=\nBUILD_TRACE=true',
  '# Production — another rollout difference\nAPP_ENV=production\nAPI_BASE_URL=https://api.example.test\nREDIS_URL=redis://production.example.test:6379\nWORKER_COUNT=8\nPAYMENT_MODE=true\nPAYMENT_KEY="production-example-only"\nLOG_LEVEL=info',
];

const HEALTHY_EXAMPLE = [
  'export API_BASE_URL="http://localhost:3000"\nFEATURE_CHECKOUT=false\nWORKER_COUNT=2\nPAYMENT_KEY="dev-example-only"\nLOG_LEVEL=debug',
  'export API_BASE_URL="https://staging.example.test"\nFEATURE_CHECKOUT=true\nWORKER_COUNT=4\nPAYMENT_KEY="stage-example-only"\nLOG_LEVEL=info',
  'export API_BASE_URL="https://api.example.test"\nFEATURE_CHECKOUT=true\nWORKER_COUNT=12\nPAYMENT_KEY="production-example-only"\nLOG_LEVEL=warn',
];

const PRESETS = [
  { label: 'Deployment drift', values: DRIFT_EXAMPLE },
  { label: 'Healthy differences', values: HEALTHY_EXAMPLE },
];

interface EnvironmentEditor {
  name: string;
  source: string;
  revealed: boolean;
  inputError: string | null;
  loading: boolean;
}

const labelStyle: CSSProperties = { display: 'block', fontSize: '.74rem', fontWeight: 700, color: 'var(--k-text-muted)', marginBottom: '.4rem', fontFamily: "'Poppins', sans-serif" };
const inputStyle: CSSProperties = { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '.65rem .75rem', border: '1.5px solid var(--k-border)', borderRadius: '.55rem', background: 'var(--k-bg)', color: 'var(--k-text)', fontFamily: "'Mulish', sans-serif", fontSize: '.88rem' };
const buttonStyle: CSSProperties = { border: '1px solid var(--k-border)', background: 'var(--k-bg-elevated)', color: 'var(--k-text)', borderRadius: '.5rem', padding: '.55rem .8rem', minHeight: '38px', fontFamily: "'Poppins', sans-serif", fontSize: '.73rem', fontWeight: 700, cursor: 'pointer' };
const mutedStyle: CSSProperties = { fontSize: '.76rem', color: 'var(--k-text-muted)', lineHeight: 1.55 };

function createEditors(sources: string[]): EnvironmentEditor[] {
  return DEFAULT_NAMES.map((name, index) => ({ name, source: sources[index] ?? '', revealed: false, inputError: null, loading: false }));
}

function cellPresentation(cell: EnvironmentCell, baselineCell: EnvironmentCell, isBaseline: boolean) {
  if (!cell.present) return { label: cell.missing ? '× Missing' : '— Absent', detail: cell.missing ? 'In baseline' : 'Not in baseline', color: cell.missing ? DANGER : 'var(--k-text-muted)' };
  if (cell.type === 'empty') return { label: '! Empty', detail: cell.extra ? 'Extra key' : cell.emptyChanged ? 'Filled in baseline' : 'No value', color: ACCENT };
  if (cell.extra) return { label: '+ Extra', detail: TYPE_LABEL[cell.type!], color: ACCENT };
  if (cell.typeChanged) return { label: `! ${TYPE_LABEL[cell.type!]}`, detail: `Baseline: ${TYPE_LABEL[baselineCell.type!]}`, color: ACCENT };
  if (cell.emptyChanged) return { label: '! Filled', detail: `${TYPE_LABEL[cell.type!]}; baseline empty`, color: ACCENT };
  return { label: `✓ ${TYPE_LABEL[cell.type!]}`, detail: isBaseline ? 'Reference shape' : 'Same shape', color: GOOD };
}

function rowExplanation(row: EnvironmentRow, comparison: EnvironmentComparison) {
  const names = (predicate: (cell: EnvironmentCell) => boolean) => row.cells.flatMap((cell, index) => predicate(cell) ? [comparison.environments[index].name] : []).join(', ');
  const presentIn = names((cell) => cell.present);
  const missingIn = names((cell) => cell.missing);
  const extraIn = names((cell) => cell.extra);
  const emptyIn = names((cell) => cell.type === 'empty');
  const typeChanges = row.cells.flatMap((cell, index) => cell.typeChanged ? [`${comparison.environments[index].name} appears ${TYPE_LABEL[cell.type!]} while the baseline appears ${TYPE_LABEL[row.cells[comparison.baselineIndex].type!]}`] : []);
  const filledIn = names((cell) => cell.emptyChanged && cell.type !== 'empty');
  const details: string[] = [];
  if (missingIn) details.push(`${missingIn} is missing this key; ${presentIn} defines it. A consumer relying on this key may use a fallback or fail to initialize.`);
  if (extraIn) details.push(`This key exists in ${extraIn} but not in ${comparison.baselineName}. It may be an intentional environment-specific setting or an incomplete rollout.`);
  if (emptyIn) details.push(`${emptyIn} defines this key with no non-whitespace value. An empty value may behave differently from a missing key or an application default.`);
  if (typeChanges.length) details.push(`${typeChanges.join('; ')}. Code expecting a particular parsed shape may handle it differently.`);
  if (filledIn) details.push(`${filledIn} has a value where the baseline is empty. Confirm whether that override is intentional.`);
  if (!details.length) details.push('Presence and apparent type align in every environment. Values are not compared for equality, so different credentials, hosts, or other values are not flagged.');
  return {
    what: `${row.key}: ${row.needsReview ? 'review the structural difference' : 'structure aligned'}`,
    details,
    tip: missingIn ? 'Confirm that the missing key is required, add it through your normal configuration process, then check the deployed configuration again.'
      : typeChanges.length ? 'Check the expected parser or schema for this key. Keep the intended value shape consistent, or document the environment-specific exception.'
        : emptyIn ? 'Confirm that blank values are intentional and check how the application handles empty settings.'
          : extraIn ? 'Decide whether this key belongs in the baseline or is intentionally limited to one environment.'
            : filledIn ? 'Check whether a default or override is intended in each environment.'
              : 'No structural change is suggested for this key. This check cannot validate a credential, endpoint, or runtime behavior.',
  };
}

export default function EnvironmentDriftDetector() {
  const id = useId();
  const [editors, setEditors] = useState<EnvironmentEditor[]>(() => createEditors(DRIFT_EXAMPLE));
  const [baselineIndex, setBaselineIndex] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>('Deployment drift');
  const [search, setSearch] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);
  const fileLoads = useRef([0, 0, 0]);

  const parsed = useMemo(() => editors.map((editor) => parseEnvironment(editor.source)), [editors[0].source, editors[1].source, editors[2].source]);
  const names = useMemo(() => {
    const labels = editors.map((editor, index) => editor.name.trim() || DEFAULT_NAMES[index]);
    return labels.map((name, index) => labels.filter((label) => label === name).length > 1 ? `${name} · ${index + 1}` : name);
  }, [editors[0].name, editors[1].name, editors[2].name]);
  const hasInputErrors = editors.some((editor, index) => editor.inputError || !parsed[index].valid);
  const isLoading = editors.some((editor) => editor.loading);
  const comparison = useMemo(() => hasInputErrors || isLoading ? null : compareEnvironments(
    parsed.map((environment, index) => ({ id: `environment-${index + 1}`, name: names[index], parsed: environment })),
    baselineIndex,
  ), [parsed, names, baselineIndex, hasInputErrors, isLoading]);
  const visibleRows = useMemo(() => comparison?.rows.filter((row) => (!reviewOnly || row.needsReview) && row.key.toLowerCase().includes(search.trim().toLowerCase())) ?? [], [comparison, search, reviewOnly]);
  const activeRow = visibleRows.find((row) => row.key === selectedKey) ?? visibleRows.find((row) => row.needsReview) ?? visibleRows[0];
  const keyExplanation = comparison && activeRow ? rowExplanation(activeRow, comparison) : null;
  const highestDrift = comparison?.environments.filter((environment) => comparison.highestDriftIds.includes(environment.id)) ?? [];
  const checklist = comparison ? missingKeyChecklist(comparison) : '';

  const updateSource = (index: number, source: string, mask = false) => {
    fileLoads.current[index] += 1;
    setActivePreset(null);
    setActionStatus('');
    setCopyFailed(false);
    const withinLimit = isEnvironmentWithinSizeLimit(source);
    setEditors((current) => current.map((editor, position) => position === index ? {
      ...editor,
      source: withinLimit ? source : editor.source,
      revealed: mask ? false : editor.revealed,
      loading: false,
      inputError: withinLimit ? null : 'Input not loaded: use no more than 256 KB. The previous contents are unchanged; replace or clear this panel to continue.',
    } : editor));
  };

  const loadPreset = (sources: string[], label: string) => {
    fileLoads.current = fileLoads.current.map((token) => token + 1);
    setEditors(createEditors(sources));
    setBaselineIndex(0);
    setActivePreset(label);
    setSearch('');
    setReviewOnly(false);
    setSelectedKey('');
    setActionStatus('');
    setCopyFailed(false);
  };

  const clearAll = () => {
    fileLoads.current = fileLoads.current.map((token) => token + 1);
    setEditors((current) => current.map((editor) => ({ ...editor, source: '', revealed: false, inputError: null, loading: false })));
    setActivePreset(null);
    setSearch('');
    setSelectedKey('');
    setActionStatus('Configurations cleared.');
    setCopyFailed(false);
  };

  const loadFile = async (index: number, file: File) => {
    const token = ++fileLoads.current[index];
    setActivePreset(null);
    setActionStatus('');
    setCopyFailed(false);
    if (file.size > ENVIRONMENT_LIMITS.maxBytes) {
      setEditors((current) => current.map((editor, position) => position === index ? { ...editor, loading: false, revealed: false, inputError: 'File not loaded: the limit is 256 KB. The previous contents are unchanged; replace or clear this panel to continue.' } : editor));
      return;
    }
    setEditors((current) => current.map((editor, position) => position === index ? { ...editor, loading: true, revealed: false, inputError: null } : editor));
    try {
      const source = await file.text();
      if (fileLoads.current[index] === token) updateSource(index, source, true);
    } catch {
      if (fileLoads.current[index] === token) {
        setEditors((current) => current.map((editor, position) => position === index ? { ...editor, loading: false, inputError: 'The file could not be read. Try a plain-text file or paste the contents into this panel.' } : editor));
      }
    }
  };

  const copyChecklist = async () => {
    const copied = await copyText(checklist);
    setCopyFailed(!copied);
    setActionStatus(copied ? 'Missing-key checklist copied. Configuration values were omitted.' : 'Clipboard access is unavailable. Select and copy the checklist below.');
  };

  const downloadReport = () => {
    if (!comparison) return;
    try {
      downloadJSON(sanitizedEnvironmentComparison(comparison), 'environment-drift-sanitized.json');
      setActionStatus('Sanitized report generated. It contains key names, presence, types, and counts; no configuration values.');
    } catch {
      setActionStatus('The download could not start in this browser. You can still copy the missing-key checklist.');
    }
  };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: 'clamp(1rem, 3vw, 1.5rem)', minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.75rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.12rem', fontWeight: 800, color: 'var(--k-text)', margin: '0 0 .35rem' }}>Find the configuration gap</h2>
          <p style={{ ...mutedStyle, margin: 0, maxWidth: '68ch' }}>Compare key presence, empty settings, and apparent value types. Different secret values are expected and are never compared for equality.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
          <button type="button" onClick={() => loadPreset(DRIFT_EXAMPLE, 'Deployment drift')} style={buttonStyle}>Reset</button>
          <button type="button" onClick={clearAll} style={buttonStyle}>Clear all</button>
        </div>
      </div>

      <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={loadPreset} accent={ACCENT} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '.875rem', minWidth: 0 }}>
        {editors.map((editor, index) => (
          <section key={index} aria-labelledby={`${id}-name-label-${index}`} style={{ minWidth: 0, border: `1.5px solid ${index === baselineIndex ? ACCENT : 'var(--k-border)'}`, borderRadius: '.85rem', padding: '1rem', background: 'var(--k-bg-elevated)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'center', marginBottom: '.6rem' }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.06em', color: index === baselineIndex ? ACCENT : 'var(--k-text-muted)' }}>Environment {index + 1}{index === baselineIndex ? ' · Baseline' : ''}</span>
              <button type="button" onClick={() => updateSource(index, '', true)} style={{ ...buttonStyle, padding: '.25rem .45rem', minHeight: '30px', fontSize: '.68rem' }} aria-label={`Clear ${names[index]} configuration`}>Clear</button>
            </div>
            <label id={`${id}-name-label-${index}`} htmlFor={`${id}-name-${index}`} style={labelStyle}>Environment name</label>
            <input id={`${id}-name-${index}`} value={editor.name} maxLength={32} placeholder={DEFAULT_NAMES[index]} autoComplete="off" aria-label={`Environment ${index + 1} name`} onChange={(event) => {
              const name = event.target.value;
              setEditors((current) => current.map((item, position) => position === index ? { ...item, name } : item));
            }} style={{ ...inputStyle, marginBottom: '.8rem', fontWeight: 700 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '.4rem', marginBottom: '.4rem' }}>
              <label htmlFor={`${id}-source-${index}`} style={{ ...labelStyle, margin: 0 }}>{editor.revealed ? 'Configuration · visible' : 'Configuration · masked'}</label>
              <button type="button" aria-pressed={editor.revealed} aria-controls={`${id}-source-${index}`} aria-label={`${editor.revealed ? 'Mask' : 'Reveal and edit'} ${names[index]} values`} onClick={() => setEditors((current) => current.map((item, position) => position === index ? { ...item, revealed: !item.revealed } : item))} style={{ ...buttonStyle, padding: '.35rem .5rem', minHeight: '32px', fontSize: '.65rem', color: ACCENT }}>{editor.revealed ? 'Mask values' : 'Reveal & edit'}</button>
            </div>
            <textarea
              id={`${id}-source-${index}`}
              aria-label={`${names[index]} configuration${editor.revealed ? ', values visible' : ', values masked'}`}
              aria-describedby={`${id}-hint-${index}`}
              aria-invalid={Boolean(editor.inputError || !parsed[index].valid)}
              value={editor.revealed ? editor.source : maskedEnvironmentPreview(parsed[index])}
              readOnly={!editor.revealed}
              onChange={(event) => updateSource(index, event.target.value)}
              onPaste={(event) => {
                if (editor.revealed) return;
                event.preventDefault();
                updateSource(index, event.clipboardData.getData('text/plain'), true);
              }}
              rows={8}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder={editor.revealed ? 'KEY=value\nFEATURE_ENABLED=true' : 'Paste KEY=VALUE content here.\nValues will stay masked.\nUse Reveal & edit to type.'}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '180px', fontFamily: "'Courier New', monospace", fontSize: '.76rem', lineHeight: 1.65 }}
            />
            <p id={`${id}-hint-${index}`} style={{ ...mutedStyle, fontSize: '.69rem', margin: '.45rem 0 .75rem' }}>{editor.revealed ? 'Values are visible in this panel. Mask them when you finish editing.' : 'Paste replaces this panel. Only key names and masked placeholders are displayed; comments are hidden.'}</p>
            <label htmlFor={`${id}-file-${index}`} style={labelStyle}>Load local .env / text file · up to 256 KB</label>
            <input id={`${id}-file-${index}`} type="file" accept=".env,.txt,text/plain" aria-label={`Load a local file for ${names[index]}`} onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void loadFile(index, file);
            }} style={{ color: 'var(--k-text)', width: '100%', minWidth: 0, fontSize: '.7rem', minHeight: '38px' }} />
            <div aria-live="polite" style={{ marginTop: '.45rem', fontSize: '.72rem', color: editor.inputError || !parsed[index].valid ? DANGER : 'var(--k-text-muted)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
              {editor.loading ? 'Reading local file…' : editor.inputError ? editor.inputError : parsed[index].valid ? `${parsed[index].entries.length} key${parsed[index].entries.length === 1 ? '' : 's'} parsed${!parsed[index].entries.length ? ' · this environment is empty' : ' · values omitted from results'}` : (
                <>
                  <strong>{parsed[index].issueCount} input issue{parsed[index].issueCount === 1 ? '' : 's'} — comparison paused</strong>
                  <ul style={{ margin: '.35rem 0 0', paddingLeft: '1rem' }}>{parsed[index].issues.slice(0, 3).map((issue, issueIndex) => <li key={issueIndex}>{issue.line === null ? '' : `Line ${issue.line}: `}{issue.message}</li>)}</ul>
                  {parsed[index].issueCount > 3 && <p style={{ margin: '.35rem 0 0' }}>Fix these first to review the remaining {parsed[index].issueCount - 3} issue{parsed[index].issueCount - 3 === 1 ? '' : 's'}.</p>}
                </>
              )}
            </div>
          </section>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem 1.25rem', alignItems: 'center', margin: '1.25rem 0' }}>
        <div style={{ minWidth: 'min(100%, 210px)', maxWidth: '100%' }}>
          <label htmlFor={`${id}-baseline`} style={labelStyle}>Compare every environment to</label>
          <select id={`${id}-baseline`} value={baselineIndex} onChange={(event) => { setBaselineIndex(Number(event.target.value)); setActionStatus(''); }} style={inputStyle}>
            {names.map((name, index) => <option key={index} value={index}>{name}</option>)}
          </select>
        </div>
        <p style={{ ...mutedStyle, flex: '1 1 250px', margin: 0 }}>The baseline defines expected keys and shapes. Missing, extra, and drift counts change when you choose a different reference.</p>
      </div>

      {hasInputErrors && <Warning level="danger" title="Fix the input before comparing">At least one environment could not be read completely. The matrix and exports are paused so partial input cannot produce a misleading result. Values never appear in error messages.</Warning>}
      {!hasInputErrors && isLoading && <Warning level="info" title="Reading your local configuration">Comparison resumes when the file is ready.</Warning>}
      {comparison && !comparison.totalKeys && <Warning level="info" title="Add configurations to see the differences">Paste into a masked panel, choose a local file, or load an example. Blank lines and comments alone do not define keys.</Warning>}

      {comparison && comparison.totalKeys > 0 && (
        <>
          {!comparison.environments[baselineIndex].keyCount && <Warning level="warn" title="The baseline has no keys">Other environments will show extra keys, but no missing keys can be found against an empty reference. Add the expected configuration or select a populated baseline.</Warning>}
          <ResultPanel title="Structural drift summary">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 125px), 1fr))', gap: '.65rem', marginBottom: '1.1rem' }}>
              <Metric label="Drift" value={String(comparison.structuralDifferences)} color={comparison.structuralDifferences ? ACCENT : GOOD} sublabel="Key/environment differences" />
              <Metric label="Missing keys" value={String(comparison.missingCount)} color={comparison.missingCount ? DANGER : undefined} sublabel={`Expected by ${comparison.baselineName}`} />
              <Metric label="Extra keys" value={String(comparison.extraCount)} sublabel="Outside the baseline" />
              <Metric label="Empty values" value={String(comparison.emptyCount)} color={comparison.emptyCount ? ACCENT : undefined} sublabel="Across all environments" />
              <Metric label="Type differences" value={String(comparison.typeDifferenceCount)} sublabel="Compared with baseline" />
            </div>
            <div style={{ display: 'grid', gap: '.7rem', marginBottom: '1rem' }}>
              {comparison.environments.map((environment) => (
                <div key={environment.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', color: 'var(--k-text)', fontSize: '.79rem', lineHeight: 1.5, marginBottom: '.3rem', overflowWrap: 'anywhere' }}>
                    <strong>{environment.name}{environment.baseline ? ' · baseline' : comparison.highestDriftIds.includes(environment.id) ? ' · highest drift' : ''}</strong>
                    <span style={{ color: 'var(--k-text-muted)', flexShrink: 0 }}>{environment.driftKeys.length} / {comparison.totalKeys} keys differ</span>
                  </div>
                  <div aria-hidden="true" style={{ height: '8px', borderRadius: '999px', background: 'var(--k-bg-card)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${environment.driftKeys.length / comparison.totalKeys * 100}%`, background: ACCENT, borderRadius: '999px' }} /></div>
                </div>
              ))}
            </div>
            <Insight
              what={highestDrift.length ? `${highestDrift.map((environment) => environment.name).join(' and ')} ${highestDrift.length === 1 ? 'has' : 'share'} the highest structural drift: ${highestDrift[0].driftKeys.length} key${highestDrift[0].driftKeys.length === 1 ? '' : 's'} from ${comparison.baselineName}.` : comparison.emptyCount ? `The structures align, but ${comparison.emptyCount} defined value${comparison.emptyCount === 1 ? ' is' : 's are'} empty.` : `All ${comparison.totalKeys} keys have aligned structures.`}
              why={comparison.structuralDifferences ? `The comparison found ${comparison.missingCount} missing, ${comparison.extraCount} extra, ${comparison.typeDifferenceCount} type, and ${comparison.emptyChangeCount} empty-state differences. Each affected key counts once per compared environment.` : 'Only key presence, apparent types, and empty states are compared. Different values with the same shape are intentionally left alone.'}
              tip={comparison.missingCount ? 'Start with the missing-key checklist, then select a key in the matrix to inspect its type or empty-state differences.' : comparison.structuralDifferences || comparison.emptyCount ? 'Select a marked key in the matrix. Confirm whether the difference is an intentional override before changing configuration.' : 'Structure looks consistent. If an environment still behaves differently, check its runtime configuration, access, and application behavior separately.'}
            />
          </ResultPanel>

          <ResultPanel title="Configuration matrix">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem 1.25rem', alignItems: 'end', marginBottom: '1rem' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label htmlFor={`${id}-search`} style={labelStyle}>Find a key</label>
                <input id={`${id}-search`} type="search" value={search} maxLength={128} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. REDIS or FEATURE" style={inputStyle} />
              </div>
              <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontSize: '.78rem', fontWeight: 700, color: 'var(--k-text)', minHeight: '42px', cursor: 'pointer' }}><input type="checkbox" checked={reviewOnly} onChange={(event) => setReviewOnly(event.target.checked)} style={{ accentColor: ACCENT, width: '16px', height: '16px' }} />Only keys needing review</label>
            </div>
            <p style={{ ...mutedStyle, margin: '0 0 .75rem' }}>✓ same shape · × missing · + extra · ! type or empty-state review. Select a key for an explanation. Values stay omitted even while an input is revealed.</p>
            <div role="region" aria-label="Configuration matrix, scroll horizontally on small screens" tabIndex={0} style={{ width: '100%', maxWidth: '100%', overflow: 'auto', maxHeight: '470px', border: '1px solid var(--k-border)', borderRadius: '.75rem', background: 'var(--k-bg)', minWidth: 0 }}>
              <table style={{ width: '100%', minWidth: '540px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '.76rem', tableLayout: 'fixed' }}>
                <caption style={{ textAlign: 'left', padding: '.75rem', color: 'var(--k-text-muted)', fontSize: '.72rem' }}>{visibleRows.length} of {comparison.totalKeys} keys · reference: {comparison.baselineName}</caption>
                <thead><tr>
                  <th scope="col" style={{ width: '31%', padding: '.75rem', borderBottom: '1px solid var(--k-border)', color: 'var(--k-text)' }}>Configuration key</th>
                  {comparison.environments.map((environment) => <th key={environment.id} scope="col" style={{ padding: '.75rem .5rem', borderBottom: '1px solid var(--k-border)', color: environment.baseline ? ACCENT : 'var(--k-text)', overflowWrap: 'anywhere' }}>{environment.name}{environment.baseline && <span style={{ display: 'block', fontSize: '.65rem', fontWeight: 500 }}>Baseline</span>}</th>)}
                </tr></thead>
                <tbody>
                  {visibleRows.map((row) => <tr key={row.key} style={{ background: activeRow?.key === row.key ? `color-mix(in srgb, ${ACCENT} 7%, var(--k-bg-card))` : 'transparent' }}>
                    <th scope="row" style={{ padding: '.7rem .75rem', borderBottom: '1px solid var(--k-border)', verticalAlign: 'top', overflowWrap: 'anywhere' }}><button type="button" onClick={() => setSelectedKey(row.key)} aria-pressed={activeRow?.key === row.key} aria-controls={`${id}-key-explanation`} style={{ border: 0, borderRadius: '.25rem', background: 'transparent', color: 'var(--k-text)', fontFamily: "'Courier New', monospace", fontSize: '.76rem', fontWeight: 700, lineHeight: 1.6, textAlign: 'left', padding: 0, cursor: 'pointer', overflowWrap: 'anywhere', textDecoration: activeRow?.key === row.key ? 'underline' : 'none', textUnderlineOffset: '3px' }}>{row.key}</button></th>
                    {row.cells.map((cell, index) => {
                      const presentation = cellPresentation(cell, row.cells[baselineIndex], index === baselineIndex);
                      return <td key={cell.environmentId} style={{ padding: '.7rem .5rem', borderBottom: '1px solid var(--k-border)', verticalAlign: 'top' }}><strong style={{ color: presentation.color, display: 'block', lineHeight: 1.5 }}>{presentation.label}</strong><span style={{ display: 'block', fontSize: '.65rem', color: 'var(--k-text-muted)', marginTop: '.15rem', lineHeight: 1.4 }}>{presentation.detail}</span></td>;
                    })}
                  </tr>)}
                  {!visibleRows.length && <tr><td colSpan={4} style={{ padding: '1.5rem', color: 'var(--k-text-muted)', textAlign: 'center' }}>No keys match these filters. Clear the search or show all keys.</td></tr>}
                </tbody>
              </table>
            </div>
            {keyExplanation && <div id={`${id}-key-explanation`} style={{ marginTop: '1rem', overflowWrap: 'anywhere' }}><Insight what={keyExplanation.what} why={<div style={{ display: 'grid', gap: '.5rem' }}>{keyExplanation.details.map((detail, index) => <p key={index} style={{ margin: 0 }}>{detail}</p>)}</div>} tip={keyExplanation.tip} /></div>}
          </ResultPanel>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem', marginTop: '1.25rem' }}>
            <button type="button" onClick={() => void copyChecklist()} style={{ ...buttonStyle, borderColor: ACCENT, color: ACCENT }}>Copy missing-key checklist ({comparison.missingCount})</button>
            <button type="button" onClick={downloadReport} style={buttonStyle}>Download sanitized JSON</button>
          </div>
          <p style={{ ...mutedStyle, margin: '.5rem 0 .75rem' }}>Exports include key names, environment names, and structural findings. Configuration values and comments are always omitted.</p>
          <details open={copyFailed || undefined} style={{ marginBottom: '1rem' }}>
            <summary style={{ ...mutedStyle, fontWeight: 700, cursor: 'pointer', color: 'var(--k-text)' }}>View missing-key checklist</summary>
            <label htmlFor={`${id}-checklist`} style={{ ...labelStyle, marginTop: '.7rem' }}>Sanitized checklist · select to copy manually</label>
            <textarea id={`${id}-checklist`} readOnly value={checklist} rows={7} style={{ ...inputStyle, fontFamily: "'Courier New', monospace", fontSize: '.75rem', resize: 'vertical' }} />
          </details>
        </>
      )}
      <p role="status" aria-live="polite" style={{ ...mutedStyle, minHeight: '1.2em', margin: '.75rem 0' }}>{actionStatus}</p>
      <AdvancedDisclosure summary="Parsing rules & how drift is counted">
        <div style={{ ...mutedStyle, gridColumn: '1 / -1' }}>
          <p style={{ marginTop: 0 }}>Use one <code>KEY=VALUE</code> per line, optionally prefixed with <code>export</code>. Keys are case-sensitive. Blank lines and comments are ignored; <code>#</code> starts a comment outside quotes. Single or double quotes must close on the same line. Duplicate keys and unsupported lines pause the comparison.</p>
          <p>Apparent types are hints: boolean, finite decimal number, URL-like, string, or empty. Quotes do not change the inferred shape. Real environment values are normally strings. Variable references and commands stay literal text; this tool does not expand or execute them.</p>
          <p>Drift counts missing, extra, type, or empty-state changes from the selected baseline, once per key per compared environment. Empty-value counts include the baseline. A difference can be intentional; matching shapes cannot prove that credentials, addresses, or configuration are correct.</p>
          <p style={{ marginBottom: 0 }}>Limits: 256 KB, 2,000 lines, and 500 keys per environment. Raw inputs stay in this page’s memory and are never added to URLs, browser storage, diagnostics, or exports. Close or clear the page when finished.</p>
        </div>
      </AdvancedDisclosure>
    </div>
  );
}
