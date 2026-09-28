import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { InfoooSourceDisclosure, InfoooStage, InfoooWorldShell } from '../InfoooWorldFoundation';
import type { InfoooWorld } from '../../../data/infooo';
import { trackInfoooWorldStart } from '../../../utils/analytics';
import ShareResultFoundation from '../../toolbox/ShareResultFoundation';
import { affectedCubieIds, applyMove, applySequence, coordsForSize, cubeCounts, cubieById, faceColors, faces, invertMove, invertSequence, isSolved, solvedCube, stickerNodes, type CubeSize, type CubeState, type Face, type Move, type Vec } from './cubeEngine';
import { cubeSurfaces, graphMotionPoint, isNearPreset, nearestViewpoint, pieceVisible, presetAngle, revealView, turnDuration, viewpoints, type CameraAngle } from './cubeMotion';
import { pieceMapSlot, pieceMapTokens } from './pieceMap';
import { cubeSizes, defaultCubeSize, newScramble, workingExamplePieceId } from './rubikExperience';
import './rubiks.css';

const faceTitles: Record<Face, string> = { U: 'Top', D: 'Bottom', L: 'Left', R: 'Right', F: 'Front', B: 'Back' };
const colorNames: Record<Face, string> = { U: 'White', D: 'Yellow', L: 'Orange', R: 'Red', F: 'Green', B: 'Blue' };
const naturalPosition = ([x, y, z]: Vec) => {
  const words = [y > 0 ? 'top' : y < 0 ? 'bottom' : '', x > 0 ? 'right' : x < 0 ? 'left' : '', z > 0 ? 'front' : z < 0 ? 'back' : ''].filter(Boolean).join('-');
  return words.charAt(0).toUpperCase() + words.slice(1);
};
const cubieWords = (cubie: ReturnType<typeof cubieById>) => cubie ? `${cubie.stickers.map(sticker => colorNames[sticker.color]).join(' · ')} ${cubie.type}` : 'Selected piece';
const sectorPath = (index: number, total: number, radius: number) => {
  const start = -Math.PI / 2 + index * 2 * Math.PI / total;
  const end = -Math.PI / 2 + (index + 1) * 2 * Math.PI / total;
  return `M0 0 L${(Math.cos(start) * radius).toFixed(3)} ${(Math.sin(start) * radius).toFixed(3)} A${radius} ${radius} 0 0 1 ${(Math.cos(end) * radius).toFixed(3)} ${(Math.sin(end) * radius).toFixed(3)} Z`;
};
type Transition = { before: CubeState; move: Move };
type Playback = { moves: readonly Move[]; baseHistory: Move[] };
type Speed = 0.5 | 1 | 2;
const speeds: Speed[] = [0.5, 1, 2];

function affectedBreakdown(state: CubeState, ids: string[]) {
  const pieces = ids.map(id => cubieById(state, id)).filter((piece): piece is NonNullable<typeof piece> => Boolean(piece));
  return {
    total: pieces.length,
    corners: pieces.filter(piece => piece.type === 'corner').length,
    edges: pieces.filter(piece => piece.type === 'edge').length,
    centers: pieces.filter(piece => piece.type === 'center').length,
  };
}

export default function RubiksCubeMotionGraph({ world }: { world: InfoooWorld }) {
  // Turn animation is explicitly requested (Randomize / Watch it solve) and brief -- roughly a
  // second per move -- so it always plays rather than being silently skipped whenever the
  // visitor's OS has "reduce motion" on, which would make the feature invisible with no way to
  // recover it. The sitewide CSS reduced-motion media query still governs any other transitions.
  const [size, setSize] = useState<CubeSize>(defaultCubeSize);
  const [state, setState] = useState<CubeState>(() => solvedCube(defaultCubeSize));
  const [history, setHistory] = useState<Move[]>([]);
  const [selectedId, setSelectedId] = useState(workingExamplePieceId);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>(() => presetAngle('Front'));
  const [transition, setTransition] = useState<Transition | null>(null);
  const [visualTurn, setVisualTurn] = useState<Transition | null>(null);
  const [motionProgress, setMotionProgress] = useState(1);
  const [view, setView] = useState<'cube' | 'motion'>('cube');
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [playIndex, setPlayIndex] = useState(0);
  const [stepDirection, setStepDirection] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [scramble, setScramble] = useState<Move[] | null>(null);
  const [scrambleNote, setScrambleNote] = useState('');
  const elapsed = useRef(0);
  const selected = cubieById(state, selectedId)!;
  const previousPiece = transition && cubieById(transition.before, selectedId);
  const hidden = !pieceVisible(selected, cameraAngle);
  const nearestView = nearestViewpoint(cameraAngle);
  const solved = isSolved(state);
  const complete = Boolean(playback && playIndex === playback.moves.length && !visualTurn);
  const affected = useMemo(() => new Set(transition ? affectedCubieIds(transition.before, transition.move) : []), [transition]);
  const counts = useMemo(() => cubeCounts(size), [size]);
  const trace = useMemo(() => {
    let cursor = solvedCube(size);
    const points = [cubieById(cursor, selectedId)?.position];
    history.forEach(move => { cursor = applyMove(cursor, move); points.push(cubieById(cursor, selectedId)?.position); });
    return points.filter((point): point is Vec => Boolean(point));
  }, [history, selectedId, size]);

  useEffect(() => { trackInfoooWorldStart(world.slug); }, [world.slug]);
  useEffect(() => {
    if (!visualTurn) return;
    if (motionPaused) return;
    let frame = 0;
    let lastTime = performance.now();
    const duration = turnDuration / speed;
    const tick = (now: number) => {
      elapsed.current += now - lastTime;
      lastTime = now;
      const progress = Math.min(1, elapsed.current / duration);
      setMotionProgress(progress * progress * (3 - 2 * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setVisualTurn(null);
    };
    frame = requestAnimationFrame(tick);
    // Safety net: a backgrounded tab makes the browser stop delivering rAF callbacks entirely
    // (Page Visibility spec), which would otherwise strand the cube mid-turn forever -- nothing
    // else ever clears visualTurn in that case. This timeout force-completes the turn a little
    // after its normal duration regardless, so switching tabs mid-turn can never get the demo
    // stuck; it's a no-op in the common case where rAF already finished the turn on time.
    const safety = window.setTimeout(() => { setMotionProgress(1); setVisualTurn(null); }, duration + 200);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(safety); };
  }, [visualTurn, motionPaused, speed]);

  const moveTo = (before: CubeState, after: CubeState, move: Move) => {
    const next = { before, move };
    setTransition(next); setState(after);
    elapsed.current = 0;
    setMotionProgress(0); setMotionPaused(false);
    setVisualTurn(next);
  };
  const stepTo = (index: number) => {
    if (!playback) return;
    const bounded = Math.max(0, Math.min(playback.moves.length, index));
    if (bounded === playIndex) return;
    const nextHistory = [...playback.baseHistory, ...playback.moves.slice(0, bounded)];
    const move = bounded > playIndex ? playback.moves[bounded - 1] : invertMove(playback.moves[playIndex - 1]);
    setStepDirection(bounded > playIndex ? 1 : -1);
    moveTo(state, applySequence(solvedCube(size), nextHistory), move);
    setHistory(nextHistory); setPlayIndex(bounded);
  };
  useEffect(() => {
    if (!playback || visualTurn) return;
    if (complete) { setPlaying(false); return; }
    if (!playing) return;
    const baseDelay = playIndex === 0 ? 1300 : 250;
    const delay = baseDelay / speed;
    const timer = window.setTimeout(() => stepTo(playIndex + 1), delay);
    return () => window.clearTimeout(timer);
  }, [playback, playIndex, playing, visualTurn, complete, speed]);

  const clearPlayback = () => {
    setPlaying(false); setPlayback(null); setPlayIndex(0);
    setTransition(null); setVisualTurn(null); setMotionProgress(1); setMotionPaused(false);
  };

  const randomizeCube = () => {
    const sequence = newScramble(size);
    clearPlayback();
    setScramble(sequence);
    setHistory(sequence);
    setState(applySequence(solvedCube(size), sequence));
    setSelectedId(workingExamplePieceId);
    setView('cube');
    setScrambleNote(`${size} by ${size} cube randomized using ${sequence.length} legal moves.`);
  };
  const startSolve = () => {
    if (!scramble) return;
    setScrambleNote('');
    setPlayback({ moves: invertSequence(scramble), baseHistory: scramble });
    setPlayIndex(0); setPlaying(true); setView('cube');
  };
  const resetDemo = () => {
    const baseHistory = playback?.baseHistory || [];
    setHistory(baseHistory); setState(applySequence(solvedCube(size), baseHistory)); setPlayIndex(0);
    setTransition(null); setVisualTurn(null); setMotionProgress(1); setMotionPaused(false); setPlaying(false);
  };
  const togglePlayback = () => {
    if (complete && playback) { resetDemo(); setPlaying(true); }
    else { setPlaying(value => !value); setMotionPaused(playing); }
  };
  const manualStep = (direction: 1 | -1) => { setPlaying(false); stepTo(playIndex + direction); };
  const selectPiece = (id: string) => {
    const piece = cubieById(state, id);
    if (!piece || (piece.type === 'center' && size !== 4)) return;
    setSelectedId(id);
    if (!pieceVisible(piece, cameraAngle)) setCameraAngle(presetAngle(revealView(piece)));
  };
  const changeSize = (nextSize: CubeSize) => {
    if (nextSize === size) return;
    setSize(nextSize);
    setState(solvedCube(nextSize));
    setHistory([]); setScramble(null); setScrambleNote('');
    clearPlayback();
    setSelectedId(workingExamplePieceId);
    // camera angle is intentionally left as-is -- a viewing preference, not part of cube state
  };

  const affectedNow = useMemo(() => affectedBreakdown(transition?.before || state, [...affected]), [transition, state, affected]);
  const activeMove = visualTurn?.move || transition?.move;
  const moveVerb = activeMove?.endsWith("'") ? 'counter-clockwise' : activeMove?.endsWith('2') ? 'double turn' : 'clockwise';
  const location = naturalPosition(selected.position);
  const solvedDemo = complete && solved;
  const phaseTitle = solvedDemo ? 'Solved' : playback ? 'Solving' : scramble ? 'Scrambled. Ready to solve.' : 'Randomize to begin.';
  const stepTotal = playback?.moves.length || 1;
  const progressValue = visualTurn ? Math.max(0, playIndex - stepDirection * (1 - motionProgress)) : playIndex;
  const announcement = `${scrambleNote ? `${scrambleNote} ` : ''}${cubieWords(selected)}. ${previousPiece ? `Previous position ${naturalPosition(previousPiece.position)}. ` : ''}Current position ${location}. ${hidden ? `Hidden from the current view. Use Reveal piece to see it.` : `Visible from the ${nearestView.toLowerCase()} side.`} ${complete ? solvedDemo ? `Solve step ${stepTotal} of ${stepTotal}. Sequence complete. Cube solved.` : 'Sequence complete.' : playback && visualTurn ? `Solve step ${playIndex} of ${stepTotal}. ${activeMove ? `${faceTitles[activeMove[0] as Face]} face ${moveVerb} completed.` : ''}` : ''}`;

  const stage = <InfoooStage label="Rubik’s Cube and motion graph" description={`A ${size} by ${size} cube and an orbital graph show the same ${counts.movable} physical pieces.`}>
    <div className="rubik-top-row">
      <div className="rubik-size-select" role="group" aria-label="Cube size">
        <span className="eyebrow">CUBE SIZE</span>
        <div className="size-buttons">{cubeSizes.map(candidate => <button type="button" key={candidate} aria-pressed={candidate === size} onClick={() => changeSize(candidate)} disabled={Boolean(visualTurn) || playing}>{candidate}×{candidate}</button>)}</div>
      </div>
      <button className="watch-one-turn randomize-btn" type="button" onClick={randomizeCube} disabled={Boolean(visualTurn) || playing}>Randomize cube <span aria-hidden="true">⟲</span></button>
    </div>
    <div className="rubik-mobile-tabs" role="group" aria-label="Visualization view">
      <button type="button" aria-pressed={view === 'cube'} onClick={() => setView('cube')}>Cube</button>
      <button type="button" aria-pressed={view === 'motion'} onClick={() => setView('motion')}>Motion</button>
    </div>
    <div className={`rubik-visuals show-${view}`}>
      <CubeView state={state} selectedId={selectedId} cameraAngle={cameraAngle} onCameraChange={setCameraAngle} turn={visualTurn} progress={motionProgress} affected={affected} onSelect={selectPiece} />
      <div className="rubik-bridge">
        <span className="bridge-label">SAME CUBE</span>
        <span className="bridge-arrow" aria-hidden="true">↔</span>
        {activeMove ? <div className="bridge-move"><strong>{faceTitles[activeMove[0] as Face]} · {moveVerb}</strong><code>{activeMove}</code>{affectedNow.total > 0 && <small>{affectedNow.total} piece{affectedNow.total === 1 ? '' : 's'} move{size === 4 && affectedNow.centers > 0 ? ` (${affectedNow.corners} corner${affectedNow.corners === 1 ? '' : 's'}, ${affectedNow.edges} edge-wing${affectedNow.edges === 1 ? '' : 's'}, ${affectedNow.centers} center${affectedNow.centers === 1 ? '' : 's'})` : affectedNow.edges > 0 ? ` (${affectedNow.corners} corner${affectedNow.corners === 1 ? '' : 's'}, ${affectedNow.edges} edge${affectedNow.edges === 1 ? '' : 's'})` : ''}</small>}</div> : <span className="bridge-hint">Select a sticker or token to trace it</span>}
      </div>
      <MotionGraph state={state} trace={trace} selectedId={selectedId} turn={visualTurn} progress={motionProgress} affected={affected} showTrail={Boolean(playback)} onSelect={selectPiece} />
    </div>
    <div className="rubik-controls-row">
      <div className="rubik-camera-controls">
        <div className="rubik-location-assist" data-hidden={hidden || undefined}>
          <p><span className="location-marker" aria-hidden="true">{hidden ? '◌' : '◉'}</span><strong>{location}</strong><span>{hidden ? `Hidden from this view · still highlighted in the graph` : `Visible from ${nearestView.toLowerCase()}`}</span></p>
          {hidden && <button type="button" onClick={() => setCameraAngle(presetAngle(revealView(selected)))}>Reveal piece <span aria-hidden="true">↗</span></button>}
        </div>
        <p className="viewpoint-hint">Drag the cube above to rotate it freely — or jump straight to a side:</p>
        <div role="group" aria-label="Jump to a side" className="viewpoint-row">{viewpoints.map(item => <button type="button" key={item} aria-pressed={isNearPreset(cameraAngle, item)} onClick={() => setCameraAngle(presetAngle(item))}>{item}</button>)}</div>
      </div>

      {(playback || scramble) && <section className={`rubik-playback${solvedDemo ? ' is-solved' : ''}`} aria-label="Step through the demonstration">
        <div className="playback-caption"><h2>{phaseTitle}</h2>{playback && <span className="move-caption">{complete ? `${playback.moves.length} steps complete` : `${playIndex} / ${stepTotal}`}</span>}</div>
        {playback && <progress max={playback.moves.length} value={progressValue} aria-label="Demonstration progress" />}
        <div className="playback-controls">
          {playback ? <>
            <button type="button" onClick={() => manualStep(-1)} disabled={!playIndex || Boolean(visualTurn)}>Step back</button>
            <button type="button" className="play-pause" onClick={togglePlayback}>{playing ? 'Pause' : complete ? 'Replay' : 'Play'}</button>
            <button type="button" onClick={() => manualStep(1)} disabled={complete || Boolean(visualTurn)}>One step</button>
            <button type="button" onClick={resetDemo}>Restart</button>
          </> : <button type="button" className="play-pause" onClick={startSolve}>Watch it solve <span aria-hidden="true">▶</span></button>}
        </div>
        <div className="speed-controls" role="group" aria-label="Playback speed">{speeds.map(value => <button type="button" key={value} aria-pressed={speed === value} onClick={() => setSpeed(value)}>{value}×</button>)}</div>
        <p>{solvedDemo ? 'The scramble was undone in reverse order. Every piece is back in its original position and orientation. This solve reverses the generated scramble.' : playback ? 'Solving by reversing the generated scramble, one legal move at a time.' : `Randomized with ${scramble?.length ?? 0} legal moves. Press Watch it solve to reverse it.`}</p>
      </section>}
    </div>

    <p className="rubik-model-note">Each motion token is one physical piece. Hidden means out of view, never gone.</p>
    <details className="advanced-sticker-view"><summary>Advanced · Sticker View</summary><p>{size}×{size} · {counts.stickers} stickers. {size === 2 ? '8 corner pieces, 3 stickers each.' : size === 3 ? '8 corners × 3 + 12 edges × 2 + 6 centers × 1 -- 54 stickers are not 54 independent pieces.' : '8 corners, 24 edge-wings and 24 movable centers -- no single fixed center per face like 3×3.'}</p><StickerView state={state} size={size} selectedId={selectedId} onSelect={selectPiece} /></details>
    <details className="rubik-truth"><summary>Sources and model limits</summary><InfoooSourceDisclosure knowledge={world.knowledge} /><ShareResultFoundation monster="infooo" contentType="infooo_world" slug={world.slug} title={world.title} /></details>
  </InfoooStage>;

  return <div className="rubik-world"><InfoooWorldShell world={world} stage={stage} footer={<p className="rubik-status" role="status" aria-live="polite">{announcement}</p>} /></div>;
}

type DragState = { active: boolean; moved: boolean; startX: number; startY: number; startYaw: number; startPitch: number };

function CubeView({ state, selectedId, cameraAngle, onCameraChange, turn, progress, affected, onSelect }: { state: CubeState; selectedId: string; cameraAngle: CameraAngle; onCameraChange: (angle: CameraAngle) => void; turn: Transition | null; progress: number; affected: Set<string>; onSelect: (id: string) => void }) {
  const surfaces = cubeSurfaces(turn?.before || state, cameraAngle, turn?.move, progress);
  const moving = new Set(turn ? affectedCubieIds(turn.before, turn.move) : []);
  const nearest = nearestViewpoint(cameraAngle);
  // Free 360 degree orbit via pointer drag (mouse + touch, via the Pointer Events API), with the
  // six named buttons below staying as quick jump-to shortcuts. A short drag-distance threshold
  // distinguishes "drag to orbit" from "click a sticker to select it" -- onStickerClick swallows
  // the click that would otherwise fire right after a drag ends on whatever sticker is under the
  // pointer.
  const drag = useRef<DragState>({ active: false, moved: false, startX: 0, startY: 0, startYaw: 0, startPitch: 0 });
  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = { active: true, moved: false, startX: event.clientX, startY: event.clientY, startYaw: cameraAngle.yaw, startPitch: cameraAngle.pitch };
    // Some input paths (simulated pointer events, certain touch/stylus edge cases) report a
    // pointerId the browser no longer considers active by the time capture is requested; capture
    // is an optimization (keeps pointermove reporting during a fast drag off the SVG), not a
    // correctness requirement, so a failure here is safe to ignore.
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer already inactive */ }
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    const yaw = ((d.startYaw + dx * 0.5) % 360 + 360) % 360;
    const pitch = Math.max(-85, Math.min(85, d.startPitch - dy * 0.5));
    onCameraChange({ yaw, pitch });
  };
  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    drag.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onStickerClick = (id: string) => {
    if (drag.current.moved) { drag.current.moved = false; return; }
    onSelect(id);
  };
  return <section className="cube-view" aria-label="Rubik’s Cube"><h2>Rubik’s Cube <span>{nearest} view · drag to orbit</span></h2>
    <svg
      className="cube-orbit-svg" viewBox="0 0 320 360" role="group"
      aria-label={`Three-dimensional Rubik’s Cube. Drag to rotate the view freely, or use the side buttons below. Currently near the ${nearest.toLowerCase()} view. Select a visible colored sticker to follow its piece.`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
    >
      <title>Rubik’s Cube</title><ellipse cx="160" cy="330" rx="97" ry="13" fill="#244536" opacity=".08" />
      {surfaces.map(surface => {
        const piece = cubieById(state, surface.cubieId)!;
        const selected = piece.id === selectedId;
        const selectable = Boolean(surface.color) && (piece.type !== 'center' || state.size === 4);
        const marker = surface.stickerPoints.split(' ')[0].split(',').map(Number);
        return <g key={surface.id} className={moving.has(piece.id) ? 'cube-moving-piece' : undefined}>
          <polygon points={surface.points} className="cube-plastic" />
          {surface.color && <polygon points={surface.stickerPoints} fill={faceColors[surface.color]} className={`cube-sticker${selected ? ' selected' : ''}${affected.has(piece.id) ? ' affected' : ''}${selectable ? ' movable' : ''}`} tabIndex={selectable ? 0 : undefined} role={selectable ? 'button' : undefined} aria-label={`${colorNames[surface.color]} sticker; ${cubieWords(piece)} at ${naturalPosition(piece.position)}`} onClick={selectable ? () => onStickerClick(piece.id) : undefined} onKeyDown={selectable ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(piece.id); } } : undefined} />}
          {surface.color && selected && <circle cx={marker[0]} cy={marker[1]} r="3.2" className="identity-dot cube-identity-dot" aria-hidden="true" />}
        </g>;
      })}
    </svg>
  </section>;
}

function MotionGraph({ state, trace, selectedId, turn, progress, affected, showTrail, onSelect }: { state: CubeState; trace: Vec[]; selectedId: string; turn: Transition | null; progress: number; affected: Set<string>; showTrail: boolean; onSelect: (id: string) => void }) {
  const tokens = pieceMapTokens(state);
  const moving = new Set(turn ? affectedCubieIds(turn.before, turn.move) : []);
  const from = turn && cubieById(turn.before, selectedId);
  const to = cubieById(state, selectedId);
  const showPath = Boolean(from && to && moving.has(selectedId));
  const slotFor = (position: Vec) => state.size === 3 ? pieceMapSlot(position) : (tokens.find(token => token.position.join(',') === position.join(','))?.slot ?? [200, 200] as const);
  const isCrowded = tokens.length > 20; // 4x4: edge-wings/centers need smaller tokens to stay legible at their radius
  const radiusFor = (type: string, selected: boolean) => {
    if (type === 'center') return selected ? 8 : 6;
    if (type === 'edge' && isCrowded) return selected ? 12 : 9;
    return selected ? 17 : 14;
  };
  return <section className="motion-graph" aria-label="Motion graph"><h2>Motion graph</h2><svg viewBox="0 0 400 400" role="group" aria-label={`${tokens.length} physical piece tokens. Select any token to reveal its piece on the cube.`}>
    <title>Motion graph of the physical cube pieces</title><circle cx="200" cy="200" r="188" className="orbit outer" /><circle cx="200" cy="200" r="142" className="orbit inner" /><circle cx="200" cy="200" r="55" className="orbit core" /><text x="200" y="194" textAnchor="middle" className="graph-center-label">SAME</text><text x="200" y="211" textAnchor="middle" className="graph-center-label">CUBE</text>
    {showTrail && trace.length > 1 && <polyline points={trace.slice(-5).map(slotFor).map(point => point.join(',')).join(' ')} className="selected-trail" />}
    {showPath && from && to && <path d={`M ${slotFor(from.position).join(' ')} Q 200 200 ${slotFor(to.position).join(' ')}`} className="movement-path" style={{ opacity: Math.sin(Math.PI * progress) }} />}
    {tokens.map(token => {
      const selected = token.id === selectedId;
      const old = turn && cubieById(turn.before, token.id);
      const point = old ? graphMotionPoint(slotFor(old.position), token.slot, progress) : token.slot;
      const radius = radiusFor(token.type, selected);
      return <g key={token.id} transform={`translate(${point[0].toFixed(3)} ${point[1].toFixed(3)})`} className={`piece-token piece-token-${token.type}${selected ? ' selected' : ''}${moving.has(token.id) ? ' moving' : ''}${affected.has(token.id) ? ' affected' : ''}`} onClick={() => onSelect(token.id)} tabIndex={0} role="button" aria-label={`${token.colors.map(color => colorNames[color]).join(', ')} ${token.type} at ${naturalPosition(token.position)}`} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(token.id); } }}>
        {selected ? <circle r={radius + 7} className="selected-halo" /> : affected.has(token.id) && <circle r={radius + 5} className="affected-halo" />}
        {token.colors.map((color, index) => <path key={color} d={sectorPath(index, token.colors.length, radius)} fill={faceColors[color]} className="token-segment" />)}<circle r={radius} className="token-outline" />{selected && token.type !== 'center' && <circle cx={radius * 0.8} cy={-radius * 0.8} r={radius > 12 ? 5 : 3.2} className="identity-dot" />}
      </g>;
    })}
  </svg><p>One token = one physical piece.</p></section>;
}

// Size-aware sticker unfold: 6 faces laid out the same way regardless of size, each holding an
// N-by-N grid of that face's own stickers (formula 6*N^2, docs section 42) instead of the old
// fixed 3-by-3 layout.
const stickerFaceCenters: Record<Face, [number, number]> = { U: [50, 16], R: [76, 30], F: [76, 70], D: [50, 84], L: [24, 70], B: [24, 30] };
function StickerView({ state, size, selectedId, onSelect }: { state: CubeState; size: CubeSize; selectedId: string; onSelect: (id: string) => void }) {
  const coords = coordsForSize(size);
  const span = size === 2 ? 7.2 : size === 3 ? 10.4 : 12.6;
  const cell = size > 1 ? span / (size - 1) : 0;
  const territory = size === 2 ? 8.5 : size === 3 ? 10 : 11.4;
  return <svg className="sticker-view" viewBox="0 0 100 100" role="group" aria-label={`Advanced view with all ${6 * size * size} visible cube stickers`}><title>Advanced Sticker View</title>
    {faces.map(face => { const [x, y] = stickerFaceCenters[face]; return <g key={face}><circle cx={x} cy={y} r={territory} className="sticker-territory" /><text x={x} y={y - territory - 1.5} textAnchor="middle">{face}</text></g>; })}
    {stickerNodes(state).map(node => {
      const [x, y, z] = node.position;
      const colIndex = node.face === 'U' || node.face === 'D' || node.face === 'F' || node.face === 'B' ? coords.indexOf(x) : node.face === 'R' ? coords.length - 1 - coords.indexOf(z) : coords.indexOf(z);
      const rowIndex = node.face === 'U' || node.face === 'D' ? coords.indexOf(z) : coords.length - 1 - coords.indexOf(y);
      const [cx, cy] = stickerFaceCenters[node.face];
      const dx = (colIndex - (size - 1) / 2) * cell;
      const dy = (rowIndex - (size - 1) / 2) * cell;
      const selectable = node.type !== 'center' || size === 4;
      const radius = size === 4 ? 1.7 : size === 2 ? 3.2 : 2.5;
      return <circle key={node.id} cx={cx + dx} cy={cy + dy} r={selectable ? radius : radius + 0.6} fill={faceColors[node.color]} className={node.cubieId === selectedId ? 'advanced-selected' : ''} tabIndex={selectable ? 0 : undefined} role={selectable ? 'button' : undefined} aria-label={`${colorNames[node.color]} sticker; ${cubieWords(cubieById(state, node.cubieId))}`} onClick={selectable ? () => onSelect(node.cubieId) : undefined} onKeyDown={selectable ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.cubieId); } } : undefined} />;
    })}
  </svg>;
}
