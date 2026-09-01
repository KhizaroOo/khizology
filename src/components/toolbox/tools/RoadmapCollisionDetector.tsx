import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

interface ProjectSlot {
  start: number;
  duration: number;
}

interface ProjectMeta {
  name: string;
  color: string;
}

const PROJECTS_META: ProjectMeta[] = [
  { name: 'Project A', color: '#6CA6FF' },
  { name: 'Project B', color: '#DF78A0' },
  { name: 'Project C', color: '#93B96A' },
];

const DEFAULT_PROJECTS: ProjectSlot[] = [
  { start: 0, duration: 6 },
  { start: 4, duration: 5 },
  { start: 12, duration: 4 },
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
// used purely for drawing — several colliding pairs can share the same week range.
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

export default function RoadmapCollisionDetector() {
  const [projects, setProjects] = useState<ProjectSlot[]>(DEFAULT_PROJECTS);

  const updateProject = (index: number, patch: Partial<ProjectSlot>) => {
    setProjects((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const { collisions, busiest, maxWeek, totalOverlapWeeks } = useMemo(() => {
    const ends = projects.map(computeEnd);
    const maxWeekLocal = Math.max(MIN_TIMELINE_WEEKS, ...ends);
    const collisionsLocal = computeCollisions(projects);
    const busiestLocal = computeBusiestWeek(projects, maxWeekLocal);
    const totalOverlapLocal = collisionsLocal.reduce((sum, c) => sum + c.overlapWeeks, 0);
    return { collisions: collisionsLocal, busiest: busiestLocal, maxWeek: maxWeekLocal, totalOverlapWeeks: totalOverlapLocal };
  }, [projects]);

  const collisionBands = useMemo(
    () => mergeRanges(collisions.map((c) => ({ start: c.overlapStart, end: c.overlapEnd }))),
    [collisions]
  );

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

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        {PROJECTS_META.map((meta, i) => (
          <div
            key={meta.name}
            style={{
              background: 'var(--k-bg)',
              border: '1px solid var(--k-border)',
              borderRadius: '.75rem',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: '.85rem',
                color: meta.color,
                marginBottom: '.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '.4rem',
              }}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: meta.color, display: 'inline-block' }} />
              {meta.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
              <RangeControl
                label="Start week"
                value={projects[i].start}
                onChange={(v) => updateProject(i, { start: v })}
                min={0}
                max={20}
                step={1}
                formatValue={(v) => `Wk ${v}`}
                accent={meta.color}
              />
              <RangeControl
                label="Duration"
                value={projects[i].duration}
                onChange={(v) => updateProject(i, { duration: v })}
                min={1}
                max={12}
                step={1}
                formatValue={(v) => `${v} wk${v === 1 ? '' : 's'}`}
                accent={meta.color}
              />
            </div>
          </div>
        ))}
      </div>

      <VisualizationContainer minHeight={svgHeight + 40}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', maxWidth: `${svgWidth}px`, height: 'auto' }}
          role="img"
          aria-label="Gantt chart of three project timelines with red bands marking weeks where two or more projects run at the same time"
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

          {/* collision bands, spanning the full height of all rows for visibility */}
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

          {/* project rows */}
          {PROJECTS_META.map((meta, i) => {
            const p = projects[i];
            const y = topPad + i * (rowHeight + rowGap);
            const barX = leftLabelWidth + p.start * PX_PER_WEEK;
            const barW = p.duration * PX_PER_WEEK;
            return (
              <g key={meta.name}>
                <text
                  x={leftLabelWidth - 10}
                  y={y + rowHeight / 2 + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight={700}
                  fill={meta.color}
                  fontFamily="'Poppins', sans-serif"
                >
                  {meta.name}
                </text>
                <rect x={barX} y={y} width={barW} height={rowHeight} rx={8} fill={meta.color} opacity={0.88} />
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
        <span>Axis shows week number since project kickoff</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric
          label="Colliding pairs"
          value={`${collisions.length} / 3`}
          color={hasCollision ? '#ef4444' : '#22c55e'}
        />
        <Metric
          label="Total overlapping weeks"
          value={`${totalOverlapWeeks} wk${totalOverlapWeeks === 1 ? '' : 's'}`}
          color={totalOverlapWeeks > 0 ? '#ef4444' : '#22c55e'}
        />
        <Metric
          label="Busiest week"
          value={busiest.count > 0 ? `Wk ${busiest.week}` : '—'}
          sublabel={busiest.count > 0 ? `${busiest.count} project${busiest.count === 1 ? '' : 's'} running at once` : 'nothing overlaps'}
          color={busiest.count >= 3 ? '#ef4444' : busiest.count === 2 ? '#F7933C' : '#22c55e'}
        />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {hasCollision ? (
          <Warning level="danger" title={`${collisions.length} collision${collisions.length === 1 ? '' : 's'} found across these timelines`}>
            {collisions.map((c) => (
              <div key={`${c.i}-${c.j}`}>
                {PROJECTS_META[c.i].name} and {PROJECTS_META[c.j].name} overlap for {c.overlapWeeks} week{c.overlapWeeks === 1 ? '' : 's'} (weeks {c.overlapStart}–{c.overlapEnd}).
              </div>
            ))}
            {' '}If these all draw on the same limited resource, something on this board is quietly going to slip.
          </Warning>
        ) : (
          <Warning level="good" title="No resource collisions across these three timelines">
            Every project has the shared resource to itself, week to week. Move a slider and watch how little slack it takes to change that.
          </Warning>
        )}
      </div>
    </div>
  );
}
