import { useMemo, useRef, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import { clamp } from '../shared/mathHelpers';

interface ProjectSlot {
  id: number;
  name: string;
  start: number;
  duration: number;
}

// Cycled through positionally (by index in the list) so a newly added project always gets
// a distinct, on-brand color automatically -- same palette already used across the other
// Simulate/Plan tools in this toolbox.
const PALETTE = ['#6CA6FF', '#DF78A0', '#93B96A', '#F7933C', '#5CCFAF', '#F5CF5C'];
const DEFAULT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const MIN_PROJECTS = 2;
const MAX_PROJECTS = 6;

const DEFAULT_PROJECTS: ProjectSlot[] = [
  { id: 0, name: 'Project A', start: 0, duration: 6 },
  { id: 1, name: 'Project B', start: 4, duration: 5 },
  { id: 2, name: 'Project C', start: 12, duration: 4 },
];

const PX_PER_WEEK = 24;
const MIN_TIMELINE_WEEKS = 24;

interface PairCollision {
  i: number;
  j: number;
  overlapStart: number;
  overlapEnd: number;
  overlapWeeks: number;
}

function computeEnd(p: ProjectSlot): number {
  return p.start + p.duration;
}

function computeCollisions(projects: ProjectSlot[]): PairCollision[] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) pairs.push([i, j]);
  }
  const out: PairCollision[] = [];
  for (const [i, j] of pairs) {
    const a = projects[i];
    const b = projects[j];
    const aEnd = computeEnd(a);
    const bEnd = computeEnd(b);
    const overlapStart = Math.max(a.start, b.start);
    const overlapEnd = Math.min(aEnd, bEnd);
    const overlapWeeks = Math.max(0, overlapEnd - overlapStart);
    if (overlapWeeks > 0) {
      out.push({ i, j, overlapStart, overlapEnd, overlapWeeks });
    }
  }
  return out;
}

// Merge overlapping [start,end) ranges into a minimal set of non-overlapping bands,
// used purely for drawing — several colliding pairs (or overloaded weeks) can share the
// same week range.
function mergeRanges(ranges: { start: number; end: number }[]): { start: number; end: number }[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [{ ...sorted[0] }];
  for (let k = 1; k < sorted.length; k++) {
    const last = merged[merged.length - 1];
    const cur = sorted[k];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

function computeBusiestWeek(projects: ProjectSlot[], maxWeek: number): { week: number; count: number } {
  let bestWeek = 0;
  let bestCount = 0;
  for (let w = 0; w < maxWeek; w++) {
    const count = projects.filter((p) => w >= p.start && w < p.start + p.duration).length;
    if (count > bestCount) {
      bestCount = count;
      bestWeek = w;
    }
  }
  return { week: bestWeek, count: bestCount };
}

// Weeks where the number of concurrently-running projects exceeds capacity -- distinct from
// a plain pairwise collision, which can be "at capacity" (fine) without being "over capacity"
// (the real problem for a shared resource).
function computeOverCapacityWeeks(projects: ProjectSlot[], maxWeek: number, capacity: number): number[] {
  const weeks: number[] = [];
  for (let w = 0; w < maxWeek; w++) {
    const count = projects.filter((p) => w >= p.start && w < p.start + p.duration).length;
    if (count > capacity) weeks.push(w);
  }
  return weeks;
}

// Simple greedy scheduler: walks the projects in their current list order and places each
// one, at its current duration, at the earliest week that never pushes any week it covers
// over capacity. Ignores everything except duration and capacity — no priority, deadlines,
// or dependencies.
function computeSuggestedOrdering(projects: ProjectSlot[], capacity: number): number[] {
  const safeCapacity = Math.max(1, Math.round(capacity));
  const placed: { start: number; duration: number }[] = [];
  const starts: number[] = [];

  for (const p of projects) {
    const duration = Math.max(1, Math.round(p.duration));
    // Placing this project right after every already-placed one finishes is always feasible
    // (nothing else is running by then), so it's a safe upper bound on how far we ever need
    // to search -- keeps the loop below finite without an arbitrary magic number.
    const fallbackStart = placed.reduce((max, q) => Math.max(max, q.start + q.duration), 0);

    let start = 0;
    let found = false;
    while (start <= fallbackStart) {
      let feasible = true;
      for (let w = start; w < start + duration; w++) {
        const concurrent = placed.filter((q) => w >= q.start && w < q.start + q.duration).length + 1;
        if (concurrent > safeCapacity) {
          feasible = false;
          break;
        }
      }
      if (feasible) {
        found = true;
        break;
      }
      start++;
    }
    if (!found) start = fallbackStart;

    placed.push({ start, duration });
    starts.push(start);
  }
  return starts;
}

export default function RoadmapCollisionDetector() {
  const [projects, setProjects] = useState<ProjectSlot[]>(DEFAULT_PROJECTS);
  const [capacity, setCapacity] = useState(1);
  const nextIdRef = useRef(DEFAULT_PROJECTS.length);

  const updateProject = (id: number, patch: Partial<ProjectSlot>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const addProject = () => {
    setProjects((prev) => {
      if (prev.length >= MAX_PROJECTS) return prev;
      const idx = prev.length;
      const letter = DEFAULT_LETTERS[idx] ?? String(idx + 1);
      // Start it right after the last project on the list ends, so a freshly-added project
      // doesn't immediately collide with everything else by defaulting to week 0.
      const lastEnd = prev.length > 0 ? computeEnd(prev[prev.length - 1]) : 0;
      const id = nextIdRef.current++;
      return [...prev, { id, name: `Project ${letter}`, start: clamp(lastEnd, 0, 20), duration: 4 }];
    });
  };

  const removeProject = (id: number) => {
    setProjects((prev) => (prev.length <= MIN_PROJECTS ? prev : prev.filter((p) => p.id !== id)));
  };

  const { collisions, busiest, maxWeek, totalOverlapWeeks, totalPairs } = useMemo(() => {
    const ends = projects.map(computeEnd);
    const maxWeekLocal = Math.max(MIN_TIMELINE_WEEKS, ...ends);
    const collisionsLocal = computeCollisions(projects);
    const busiestLocal = computeBusiestWeek(projects, maxWeekLocal);
    const totalOverlapLocal = collisionsLocal.reduce((sum, c) => sum + c.overlapWeeks, 0);
    const n = projects.length;
    return {
      collisions: collisionsLocal,
      busiest: busiestLocal,
      maxWeek: maxWeekLocal,
      totalOverlapWeeks: totalOverlapLocal,
      totalPairs: (n * (n - 1)) / 2,
    };
  }, [projects]);

  const collisionBands = useMemo(
    () => mergeRanges(collisions.map((c) => ({ start: c.overlapStart, end: c.overlapEnd }))),
    [collisions]
  );

  const { overCapacityWeekCount, overCapacityBands } = useMemo(() => {
    const weeks = computeOverCapacityWeeks(projects, maxWeek, capacity);
    return {
      overCapacityWeekCount: weeks.length,
      overCapacityBands: mergeRanges(weeks.map((w) => ({ start: w, end: w + 1 }))),
    };
  }, [projects, maxWeek, capacity]);

  const suggestedStarts = useMemo(() => computeSuggestedOrdering(projects, capacity), [projects, capacity]);
  const anySuggestedChange = useMemo(
    () => suggestedStarts.some((s, i) => s !== projects[i]?.start),
    [suggestedStarts, projects]
  );

  const applySuggestedOrdering = () => {
    setProjects((prev) => prev.map((p, i) => ({ ...p, start: suggestedStarts[i] ?? p.start })));
  };

  const rowHeight = 42;
  const rowGap = 16;
  const leftLabelWidth = 96;
  const topPad = 8;
  const axisHeight = 26;
  const rightPad = 14;

  const chartWidth = maxWeek * PX_PER_WEEK;
  const rowsAreaHeight = projects.length * rowHeight + (projects.length - 1) * rowGap;
  const svgWidth = leftLabelWidth + chartWidth + rightPad;
  const svgHeight = topPad + rowsAreaHeight + axisHeight;

  // Week gridlines: every week for short timelines, every other week once it gets crowded.
  const tickStep = maxWeek > 30 ? 4 : maxWeek > 16 ? 2 : 1;

  const hasCollision = collisions.length > 0;
  const overCapacity = overCapacityWeekCount > 0;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '.75rem',
        }}
      >
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: '.8rem',
            color: 'var(--k-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
          }}
        >
          Projects ({projects.length} of {MAX_PROJECTS})
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        {projects.map((p, i) => {
          const color = PALETTE[i % PALETTE.length];
          const canRemove = projects.length > MIN_PROJECTS;
          return (
            <div
              key={p.id}
              style={{
                background: 'var(--k-bg)',
                border: '1px solid var(--k-border)',
                borderRadius: '.75rem',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, display: 'inline-block', flexShrink: 0 }} />
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updateProject(p.id, { name: e.target.value })}
                  placeholder={`Project ${DEFAULT_LETTERS[i] ?? i + 1}`}
                  aria-label="Project name"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 800,
                    fontSize: '.85rem',
                    color,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1.5px dashed var(--k-border)',
                    padding: '0 0 .15rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeProject(p.id)}
                  disabled={!canRemove}
                  aria-label={`Remove ${p.name || 'this project'}`}
                  title={canRemove ? `Remove ${p.name || 'this project'}` : `At least ${MIN_PROJECTS} projects required`}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    border: '1.5px solid var(--k-border)',
                    background: 'var(--k-bg-card)',
                    color: canRemove ? 'var(--k-text-muted)' : 'var(--k-border)',
                    fontSize: '.7rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canRemove ? 'pointer' : 'not-allowed',
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                <RangeControl
                  label="Start week"
                  value={p.start}
                  onChange={(v) => updateProject(p.id, { start: v })}
                  min={0}
                  max={20}
                  step={1}
                  formatValue={(v) => `Wk ${v}`}
                  accent={color}
                />
                <RangeControl
                  label="Duration"
                  value={p.duration}
                  onChange={(v) => updateProject(p.id, { duration: v })}
                  min={1}
                  max={12}
                  step={1}
                  formatValue={(v) => `${v} wk${v === 1 ? '' : 's'}`}
                  accent={color}
                />
              </div>
            </div>
          );
        })}

        {projects.length < MAX_PROJECTS && (
          <button
            type="button"
            onClick={addProject}
            style={{
              background: 'var(--k-bg)',
              border: '1.5px dashed var(--k-border)',
              borderRadius: '.75rem',
              padding: '1rem',
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '.3rem',
              cursor: 'pointer',
              color: 'var(--k-text-muted)',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: '.82rem', fontWeight: 700 }}>Add project</span>
          </button>
        )}
      </div>

      <div
        style={{
          background: 'var(--k-bg)',
          border: '1px solid var(--k-border)',
          borderRadius: '.75rem',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <RangeControl
          label="Max projects that can run at once"
          value={capacity}
          onChange={setCapacity}
          min={1}
          max={MAX_PROJECTS}
          step={1}
          formatValue={(v) => `${v} at once`}
          accent="#5CCFAF"
        />
        <p style={{ fontSize: '.76rem', color: 'var(--k-text-muted)', margin: '.6rem 0 0', lineHeight: 1.5 }}>
          This models the shared resource behind all these timelines — one shared engineer, designer, or team. Most single-owner boards should leave it at 1.
        </p>
      </div>

      <VisualizationContainer minHeight={svgHeight + 40}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', maxWidth: `${svgWidth}px`, height: 'auto' }}
          role="img"
          aria-label={`Gantt chart of ${projects.length} project timelines. A light red hatched band marks weeks where two or more projects run at the same time; a solid red band marks weeks that run more projects than the capacity of ${capacity} at once.`}
        >
          <defs>
            <pattern id="collisionHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#ef4444" opacity={0.16} />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="4" opacity={0.4} />
            </pattern>
          </defs>

          {/* week gridlines */}
          {Array.from({ length: Math.floor(maxWeek / tickStep) + 1 }, (_, k) => k * tickStep).map((w) => (
            <line
              key={`grid-${w}`}
              x1={leftLabelWidth + w * PX_PER_WEEK}
              x2={leftLabelWidth + w * PX_PER_WEEK}
              y1={topPad}
              y2={topPad + rowsAreaHeight}
              stroke="var(--k-border)"
              strokeWidth={1}
            />
          ))}

          {/* collision bands: any 2+ projects overlapping, spanning the full height of all rows */}
          {collisionBands.map((band, idx) => (
            <rect
              key={`band-${idx}`}
              x={leftLabelWidth + band.start * PX_PER_WEEK}
              y={topPad}
              width={(band.end - band.start) * PX_PER_WEEK}
              height={rowsAreaHeight}
              fill="url(#collisionHatch)"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
          ))}

          {/* over-capacity bands: strictly more projects than the capacity allows -- a
              stronger, solid marker layered on top so it reads as the more serious case */}
          {overCapacityBands.map((band, idx) => (
            <rect
              key={`overcap-${idx}`}
              x={leftLabelWidth + band.start * PX_PER_WEEK}
              y={topPad}
              width={(band.end - band.start) * PX_PER_WEEK}
              height={rowsAreaHeight}
              fill="#ef4444"
              opacity={0.32}
              stroke="#ef4444"
              strokeWidth={2}
            />
          ))}

          {/* project rows */}
          {projects.map((p, i) => {
            const color = PALETTE[i % PALETTE.length];
            const y = topPad + i * (rowHeight + rowGap);
            const barX = leftLabelWidth + p.start * PX_PER_WEEK;
            const barW = p.duration * PX_PER_WEEK;
            return (
              <g key={p.id}>
                <text
                  x={leftLabelWidth - 10}
                  y={y + rowHeight / 2 + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight={700}
                  fill={color}
                  fontFamily="'Poppins', sans-serif"
                >
                  {p.name || `Project ${DEFAULT_LETTERS[i] ?? i + 1}`}
                </text>
                <rect x={barX} y={y} width={barW} height={rowHeight} rx={8} fill={color} opacity={0.88} />
                <text
                  x={barX + barW / 2}
                  y={y + rowHeight / 2 + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={700}
                  fill="#1a1a1a"
                  fontFamily="'Poppins', sans-serif"
                >
                  {p.duration}w
                </text>
              </g>
            );
          })}

          {/* week axis */}
          <line
            x1={leftLabelWidth}
            x2={leftLabelWidth + chartWidth}
            y1={topPad + rowsAreaHeight + 8}
            y2={topPad + rowsAreaHeight + 8}
            stroke="var(--k-text-muted)"
            strokeWidth={1}
          />
          {Array.from({ length: Math.floor(maxWeek / tickStep) + 1 }, (_, k) => k * tickStep).map((w) => (
            <text
              key={`label-${w}`}
              x={leftLabelWidth + w * PX_PER_WEEK}
              y={topPad + rowsAreaHeight + 22}
              textAnchor="middle"
              fontSize="9"
              fill="var(--k-text-muted)"
            >
              {w}
            </text>
          ))}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', opacity: 0.4, borderRadius: '2px', marginRight: '.375rem', verticalAlign: 'middle' }} />
          Weeks with a resource collision
        </span>
        <span>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', opacity: 0.75, borderRadius: '2px', marginRight: '.375rem', verticalAlign: 'middle' }} />
          Weeks over capacity ({capacity} at once)
        </span>
        <span>Axis shows week number since project kickoff</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric
          label="Colliding pairs"
          value={`${collisions.length} / ${totalPairs}`}
          color={hasCollision ? '#ef4444' : '#22c55e'}
        />
        <Metric
          label="Total overlapping weeks"
          value={`${totalOverlapWeeks} wk${totalOverlapWeeks === 1 ? '' : 's'}`}
          color={totalOverlapWeeks > 0 ? '#ef4444' : '#22c55e'}
        />
        <Metric
          label="Overloaded weeks"
          value={`${overCapacityWeekCount} wk${overCapacityWeekCount === 1 ? '' : 's'}`}
          sublabel={`more than ${capacity} at once`}
          color={overCapacity ? '#ef4444' : '#22c55e'}
        />
        <Metric
          label="Busiest week"
          value={busiest.count > 0 ? `Wk ${busiest.week}` : '—'}
          sublabel={busiest.count > 0 ? `${busiest.count} project${busiest.count === 1 ? '' : 's'} running at once` : 'nothing overlaps'}
          color={busiest.count > capacity ? '#ef4444' : busiest.count === capacity && capacity > 0 ? '#F7933C' : '#22c55e'}
        />
      </div>

      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {hasCollision ? (
          <Warning level="danger" title={`${collisions.length} collision${collisions.length === 1 ? '' : 's'} found across these timelines`}>
            {collisions.map((c) => (
              <div key={`${projects[c.i].id}-${projects[c.j].id}`}>
                {projects[c.i].name} and {projects[c.j].name} overlap for {c.overlapWeeks} week{c.overlapWeeks === 1 ? '' : 's'} (weeks {c.overlapStart}–{c.overlapEnd}).
              </div>
            ))}
            {' '}If these all draw on the same limited resource, something on this board is quietly going to slip.
          </Warning>
        ) : (
          <Warning level="good" title="No resource collisions across these timelines">
            Every project has the shared resource to itself, week to week. Move a slider and watch how little slack it takes to change that.
          </Warning>
        )}

        {overCapacity ? (
          <Warning level="danger" title={`${overCapacityWeekCount} week${overCapacityWeekCount === 1 ? '' : 's'} run more projects than your capacity of ${capacity}`}>
            A collision only matters this much once it actually outstrips what your shared resource can carry at once. See the suggested ordering below for one straightforward way to flatten it.
          </Warning>
        ) : (
          <Warning level="good" title={`Every week stays at or under your capacity of ${capacity}`}>
            {hasCollision
              ? 'Some timelines still overlap, but never by more than this resource can actually handle at once.'
              : 'No project overlaps at all, so capacity was never in question.'}
          </Warning>
        )}
      </div>

      <div
        style={{
          background: 'var(--k-bg)',
          border: '1px solid var(--k-border)',
          borderRadius: '.875rem',
          padding: '1.25rem',
          marginTop: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem', marginBottom: '.85rem' }}>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: '.8rem',
              color: 'var(--k-text)',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}
          >
            Suggested feasible ordering
          </div>
          <button
            type="button"
            onClick={applySuggestedOrdering}
            disabled={!anySuggestedChange}
            style={{
              padding: '.5rem 1rem',
              borderRadius: '.5rem',
              border: 'none',
              background: anySuggestedChange ? 'var(--k-accent)' : 'var(--k-border)',
              color: anySuggestedChange ? '#1a1a1a' : 'var(--k-text-muted)',
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: '.78rem',
              textTransform: 'uppercase',
              letterSpacing: '.05em',
              cursor: anySuggestedChange ? 'pointer' : 'not-allowed',
              flexShrink: 0,
            }}
          >
            Apply suggested ordering
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '.85rem' }}>
          {projects.map((p, i) => {
            const suggested = suggestedStarts[i] ?? p.start;
            const unchanged = suggested === p.start;
            const color = PALETTE[i % PALETTE.length];
            return (
              <div key={p.id} style={{ fontSize: '.82rem', color: 'var(--k-text-muted)', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 800, color, fontFamily: "'Poppins', sans-serif" }}>{p.name || `Project ${DEFAULT_LETTERS[i] ?? i + 1}`}:</span>{' '}
                {unchanged ? (
                  <span>start week {p.start} (unchanged)</span>
                ) : (
                  <span style={{ color: 'var(--k-text)' }}>
                    suggested start week <span style={{ fontWeight: 700 }}>{suggested}</span>
                    <span style={{ color: 'var(--k-text-muted)' }}> (currently week {p.start})</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: '.76rem', color: 'var(--k-text-muted)', lineHeight: 1.5, margin: 0 }}>
          Simple greedy scheduling, not full portfolio or resource management: it takes projects in the order listed above, keeps each one's current duration, and places it at the earliest week that doesn't push any week over your capacity of {capacity}. It ignores priority, deadlines, and dependencies entirely — treat this as a starting point to rearrange from, not an optimal plan.
        </p>
      </div>
    </div>
  );
}
