import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { InfoooSourceDisclosure, InfoooStage, InfoooWorldShell, useInfoooReducedMotion } from '../InfoooWorldFoundation';
import type { InfoooWorld } from '../../../data/infooo';
import { trackInfoooWorldStart } from '../../../utils/analytics';
import ShareResultFoundation from '../../toolbox/ShareResultFoundation';
import { affectedCubieIds, applyMove, applySequence, cubieById, faceColors, faces, invertSequence, positionName, solvedCube, stickerNodes, type CubeState, type Face, type Move, type Vec } from './cubeEngine';
import { pieceMapSlot, pieceMapTokens } from './pieceMap';
import { oneTurnSequence, workingExamplePieceId, workingExampleSequence } from './rubikExperience';
import './rubiks.css';

const faceTitles: Record<Face, string> = { U: 'Top', D: 'Bottom', L: 'Left', R: 'Right', F: 'Front', B: 'Back' };
const colorNames: Record<Face, string> = { U: 'White', D: 'Yellow', L: 'Orange', R: 'Red', F: 'Green', B: 'Blue' };
const visibleFaces: Array<'U' | 'F' | 'R'> = ['U', 'F', 'R'];
const stickerFaceCenters: Record<Face, [number, number]> = { U: [50, 16], R: [76, 30], F: [76, 70], D: [50, 84], L: [24, 70], B: [24, 30] };
const stickerOffsets: Array<[number, number]> = [[-4.2, -4.2], [0, -5.2], [4.2, -4.2], [-5.2, 0], [0, 0], [5.2, 0], [-4.2, 4.2], [0, 5.2], [4.2, 4.2]];
const cubeGeometry: Record<'U' | 'F' | 'R', { origin: [number, number]; across: [number, number]; down: [number, number]; center: [number, number] }> = {
  U: { origin: [160, 28], across: [140 / 3, 62 / 3], down: [-140 / 3, 62 / 3], center: [160, 91] },
  F: { origin: [20, 90], across: [140 / 3, 60 / 3], down: [0, 160 / 3], center: [90, 200] },
  R: { origin: [160, 150], across: [140 / 3, -60 / 3], down: [0, 160 / 3], center: [230, 200] },
};

const gridPosition = (face: Face, [x, y, z]: Vec) => {
  if (face === 'U' || face === 'D') return [x + 1, z + 1] as const;
  if (face === 'F' || face === 'B') return [x + 1, 1 - y] as const;
  return [face === 'R' ? 1 - z : z + 1, 1 - y] as const;
};
const faceNodes = (state: CubeState, face: Face) => stickerNodes(state).filter(node => node.face === face);
const cubeCellPoints = (face: 'U' | 'F' | 'R', column: number, row: number) => {
  const { origin, across, down } = cubeGeometry[face];
  const point = (x: number, y: number): [number, number] => [origin[0] + x * across[0] + y * down[0], origin[1] + x * across[1] + y * down[1]];
  const corners = [point(column, row), point(column + 1, row), point(column + 1, row + 1), point(column, row + 1)];
  const center = corners.reduce<[number, number]>((sum, corner) => [sum[0] + corner[0] / 4, sum[1] + corner[1] / 4], [0, 0]);
  return corners.map(([x, y]) => `${(center[0] + (x - center[0]) * .91).toFixed(2)},${(center[1] + (y - center[1]) * .91).toFixed(2)}`).join(' ');
};
const stickerPoint = (face: Face, position: Vec): [number, number] => {
  const [column, row] = gridPosition(face, position);
  const [x, y] = stickerFaceCenters[face];
  const [dx, dy] = stickerOffsets[row * 3 + column];
  return [x + dx, y + dy];
};
const naturalPosition = ([x, y, z]: Vec) => [y === 1 ? 'Top' : y === -1 ? 'Bottom' : '', x === 1 ? 'right' : x === -1 ? 'left' : '', z === 1 ? 'front' : z === -1 ? 'back' : ''].filter(Boolean).join('-');
const cubieWords = (cubie: ReturnType<typeof cubieById>) => cubie ? `${cubie.stickers.map(sticker => colorNames[sticker.color]).join(' · ')} ${cubie.type}` : 'Selected piece';
const sectorPath = (index: number, total: number, radius: number) => {
  const start = -Math.PI / 2 + index * 2 * Math.PI / total;
  const end = -Math.PI / 2 + (index + 1) * 2 * Math.PI / total;
  return `M0 0 L${(Math.cos(start) * radius).toFixed(2)} ${(Math.sin(start) * radius).toFixed(2)} A${radius} ${radius} 0 0 1 ${(Math.cos(end) * radius).toFixed(2)} ${(Math.sin(end) * radius).toFixed(2)} Z`;
};

type VisualTurn = { before: CubeState; move: Move; key: number };
type Lesson = 'idle' | 'one-turn' | 'one-turn-done' | 'full' | 'complete';

export default function RubiksCubeMotionGraph({ world }: { world: InfoooWorld }) {
  const reducedMotion = useInfoooReducedMotion();
  const [state, setState] = useState<CubeState>(() => solvedCube());
  const [history, setHistory] = useState<Move[]>([]);
  const [selectedId, setSelectedId] = useState(workingExamplePieceId);
  const [preview, setPreview] = useState<Move | null>(null);
  const [visualTurn, setVisualTurn] = useState<VisualTurn | null>(null);
  const [modifier, setModifier] = useState<'normal' | 'inverse' | 'double'>('normal');
  const [view, setView] = useState<'cube' | 'motion'>('cube');
  const [playback, setPlayback] = useState<Move[]>([]);
  const [playIndex, setPlayIndex] = useState(0);
  const [playBase, setPlayBase] = useState<CubeState | null>(null);
  const [lesson, setLesson] = useState<Lesson>('idle');
  const [playing, setPlaying] = useState(false);
  const [announcement, setAnnouncement] = useState('Solved cube ready. The highlighted corner is the same piece in both views.');
  const motionTimer = useRef<number | undefined>(undefined);
  const lessonTimer = useRef<number | undefined>(undefined);
  const selected = cubieById(state, selectedId);
  const trace = useMemo(() => {
    let cursor = solvedCube();
    const positions = [cubieById(cursor, selectedId)?.position];
    history.forEach(move => { cursor = applyMove(cursor, move); positions.push(cubieById(cursor, selectedId)?.position); });
    return positions.filter((position): position is Vec => Boolean(position));
  }, [history, selectedId]);
  const previousPosition = trace.at(-2);
  const currentPosition = selected?.position;
  const lastMove = history.at(-1);

  useEffect(() => { trackInfoooWorldStart(world.slug); }, [world.slug]);
  useEffect(() => () => { window.clearTimeout(motionTimer.current); window.clearTimeout(lessonTimer.current); }, []);

  const animateTurn = (before: CubeState, move: Move) => {
    window.clearTimeout(motionTimer.current);
    setVisualTurn(reducedMotion ? null : { before, move, key: Date.now() });
    if (!reducedMotion) motionTimer.current = window.setTimeout(() => setVisualTurn(null), 1120);
  };
  const setPlaybackStep = (index: number) => {
    if (!playBase) return;
    const bounded = Math.max(0, Math.min(playback.length, index));
    const before = applySequence(playBase, playback.slice(0, Math.max(0, bounded - 1)));
    const next = applySequence(playBase, playback.slice(0, bounded));
    if (bounded > 0) { animateTurn(before, playback[bounded - 1]); setPreview(null); }
    else setVisualTurn(null);
    setState(next); setHistory(playback.slice(0, bounded)); setPlayIndex(bounded);
    const movingPiece = cubieById(next, selectedId);
    if (bounded === playback.length) {
      setPlaying(false);
      if (lesson === 'one-turn') {
        lessonTimer.current = window.setTimeout(() => {
          setLesson('one-turn-done');
          if (window.innerWidth <= 760) setView('motion');
        }, reducedMotion ? 0 : 1250);
        setAnnouncement(`Same physical piece. New position: ${naturalPosition(cubieById(playBase, selectedId)?.position || [1, 1, 1])} to ${naturalPosition(movingPiece?.position || [1, -1, 1])}.`);
      } else {
        setLesson('complete');
        setAnnouncement('The full trace and its inverse returned the selected piece home.');
      }
    } else setAnnouncement(`Follow the ${cubieWords(movingPiece)} at ${naturalPosition(movingPiece?.position || [1, 1, 1])}.`);
  };
  useEffect(() => {
    if (!playing || !playback.length || playIndex >= playback.length) return;
    const timer = window.setTimeout(() => setPlaybackStep(playIndex + 1), lesson === 'one-turn' ? (reducedMotion ? 500 : 1500) : (reducedMotion ? 500 : 1200));
    return () => window.clearTimeout(timer);
  }, [playing, playback, playIndex, playBase, lesson, reducedMotion]);

  const reset = () => {
    window.clearTimeout(lessonTimer.current); window.clearTimeout(motionTimer.current);
    setState(solvedCube()); setHistory([]); setPlayback([]); setPlayBase(null); setPlayIndex(0); setPlaying(false);
    setVisualTurn(null); setLesson('idle'); setSelectedId(workingExamplePieceId); setPreview(null);
    setAnnouncement('Solved cube ready. The highlighted corner is the same piece in both views.');
  };
  const startOneTurn = () => {
    window.clearTimeout(lessonTimer.current);
    const solved = solvedCube();
    setSelectedId(workingExamplePieceId); setState(solved); setHistory([]); setPlayback([...oneTurnSequence]);
    setPlayBase(solved); setPlayIndex(0); setPreview('R'); setView('cube'); setLesson('one-turn'); setPlaying(true);
    setAnnouncement('The selected top-right-front corner and matching motion token are highlighted. Watch the right layer turn.');
  };
  const startFullTrace = () => {
    window.clearTimeout(lessonTimer.current);
    const solved = solvedCube();
    setSelectedId(workingExamplePieceId); setState(solved); setHistory([]);
    setPlayback([...workingExampleSequence, ...invertSequence(workingExampleSequence)]);
    setPlayBase(solved); setPlayIndex(0); setPreview(null); setLesson('full'); setPlaying(true);
    setAnnouncement('Follow the same corner through seven turns and the inverse return.');
  };
  const apply = (move: Move) => {
    window.clearTimeout(lessonTimer.current);
    setPlaying(false); setPlayback([]); setPlayBase(null); setPlayIndex(0); setLesson('one-turn-done');
    animateTurn(state, move); setState(applyMove(state, move)); setHistory(current => [...current, move]); setPreview(null);
    setAnnouncement(`${faceTitles[move[0] as Face]} face turned. Four corners and four edges moved; the selected piece kept its identity.`);
  };
  const undo = () => {
    const move = history.at(-1); if (!move) return;
    const inverse = invertSequence([move])[0];
    setPlaying(false); setPlayback([]); setPlayBase(null); setPlayIndex(0); setLesson('one-turn-done'); animateTurn(state, inverse);
    setState(applyMove(state, inverse)); setHistory(current => current.slice(0, -1)); setAnnouncement(`Undid ${faceTitles[move[0] as Face]} turn.`);
  };
  const makeMove = (face: Face): Move => `${face}${modifier === 'inverse' ? "'" : modifier === 'double' ? '2' : ''}` as Move;
  const before = previousPosition || selected?.home;
  const currentLabel = currentPosition ? naturalPosition(currentPosition) : 'Top-right-front';
  const beforeLabel = before ? naturalPosition(before) : 'Top-right-front';
  const selectedMoved = Boolean(before && currentPosition && before.join(',') !== currentPosition.join(','));
  const showControls = lesson === 'one-turn-done' || lesson === 'full' || lesson === 'complete';
  const insightTitle = lesson === 'complete' ? 'Back where it started.' : history.length ? (selectedMoved ? 'Same piece. New position.' : 'This piece stayed put.') : 'One piece. Two views.';

  const stage = <InfoooStage label="Rubik’s Cube and motion graph" description="A familiar cube and an orbital graph show the same twenty physical corner and edge pieces.">
    <div className="rubik-mobile-tabs" role="tablist" aria-label="Visualization view">
      <button type="button" role="tab" aria-selected={view === 'cube'} onClick={() => setView('cube')}>Cube</button>
      <button type="button" role="tab" aria-selected={view === 'motion'} onClick={() => setView('motion')}>Motion</button>
    </div>
    <div className={`rubik-visuals show-${view}`}>
      <CubeView state={state} selectedId={selectedId} preview={preview} turn={visualTurn} reducedMotion={reducedMotion} onSelect={setSelectedId} />
      <div className="rubik-bridge" aria-hidden="true"><span>↔</span></div>
      <MotionGraph state={state} history={history} selectedId={selectedId} turn={visualTurn} reducedMotion={reducedMotion} showTrail={lesson === 'full'} onSelect={setSelectedId} />
    </div>
    <section className="rubik-insight" aria-live="polite" aria-label="What changed">
      <div className="rubik-insight-main"><span className="eyebrow">{history.length ? 'WHAT CHANGED?' : 'FOLLOW THE HIGHLIGHT'}</span><h2>{insightTitle}</h2><p>{history.length ? `${lastMove ? faceTitles[lastMove[0] as Face] : 'One'} face turned. Eight pieces moved${selectedMoved ? ', including this one.' : '; this one stayed put.'}` : 'The highlighted corner on the cube is the matching colored token in the motion graph.'}</p></div>
      <div className="rubik-piece-fact"><span>THIS PIECE</span><strong>{cubieWords(selected)}</strong><p>{history.length && selectedMoved ? <>{beforeLabel} <i>→</i> {currentLabel}</> : currentLabel}</p><small>{history.length && selectedMoved && before && currentPosition ? `${positionName(before)} → ${positionName(currentPosition)} · ` : ''}Same physical piece</small></div>
    </section>
    {lesson === 'one-turn-done' && <div className="rubik-next"><button type="button" onClick={startFullTrace}>Follow this piece further <span aria-hidden="true">→</span></button><span>Seven turns, then back home.</span></div>}
    {showControls && <section className="rubik-turn-area" aria-label="Try a turn">
      <div className="turn-area-heading"><span className="eyebrow">TURN IT</span><h2>Try a turn</h2></div>
      <div className="face-controls">{faces.map(face => <button key={face} type="button" aria-label={`Turn ${faceTitles[face].toLowerCase()} face ${modifier === 'inverse' ? 'counter-clockwise' : modifier === 'double' ? 'twice' : 'clockwise'} (${makeMove(face)})`} onMouseEnter={() => setPreview(makeMove(face))} onMouseLeave={() => setPreview(null)} onFocus={() => setPreview(makeMove(face))} onBlur={() => setPreview(null)} onClick={() => apply(makeMove(face))}>{faceTitles[face]} <small>{face}</small></button>)}</div>
      <div className="modifier-controls" aria-label="Turn direction">{(['normal', 'inverse', 'double'] as const).map(item => <button key={item} type="button" aria-pressed={modifier === item} onClick={() => setModifier(item)}>{item === 'normal' ? 'Clockwise' : item === 'inverse' ? '↺ Counter-clockwise' : '2× Double'}</button>)}</div>
      <div className="small-controls"><button type="button" onClick={undo} disabled={!history.length}>Undo</button><button type="button" onClick={reset}>Reset</button></div>
    </section>}
    {(lesson === 'full' || lesson === 'complete') && <section className="rubik-progress" aria-label="Piece trace"><span className="eyebrow">TRACE IT</span><p>{lesson === 'complete' ? 'The inverse turns brought this piece back home.' : 'Follow this one corner while the cube turns.'}</p><small>{trace.slice(-5).map(naturalPosition).join(' → ')}</small>{lesson === 'full' && <div className="playback-controls"><button type="button" onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Play'}</button><button type="button" onClick={() => setPlaybackStep(playIndex + 1)} disabled={playIndex >= playback.length}>Next</button><button type="button" onClick={() => setPlaybackStep(0)}>Restart</button></div>}</section>}
    <p className="rubik-model-note">Each motion token represents one physical corner or edge piece. The graph is a learning model of the cube, not its internal geometry.</p>
    <details className="advanced-sticker-view"><summary>Advanced · 54-sticker view</summary><p>The detailed sticker view uses the same cube state.</p><StickerView state={state} selectedId={selectedId} onSelect={setSelectedId} /></details>
    <details className="rubik-truth"><summary>Sources and model limits</summary><InfoooSourceDisclosure knowledge={world.knowledge} /><ShareResultFoundation monster="infooo" contentType="infooo_world" slug={world.slug} title={world.title} /></details>
  </InfoooStage>;
  return <div className="rubik-world"><InfoooWorldShell world={world} controls={<button className="watch-one-turn" type="button" onClick={startOneTurn}>Watch it move <span aria-hidden="true">→</span></button>} stage={stage} footer={<p className="rubik-status" role="status" aria-live="polite">{announcement}</p>} /></div>;
}

function CubeView({ state, selectedId, preview, turn, reducedMotion, onSelect }: { state: CubeState; selectedId: string; preview: Move | null; turn: VisualTurn | null; reducedMotion: boolean; onSelect: (id: string) => void }) {
  const affected = new Set(preview ? affectedCubieIds(state, preview) : []);
  const turnFace = turn?.move[0] as 'U' | 'F' | 'R' | undefined;
  const showTurn = Boolean(turnFace && visibleFaces.includes(turnFace) && !reducedMotion);
  const turnAngle = turn ? (turn.move.endsWith('2') ? 180 : turn.move.endsWith("'") ? -90 : 90) : 0;
  const turnCenter = turnFace && cubeGeometry[turnFace]?.center;
  return <section className="cube-view" aria-label="Rubik’s Cube"><h2>Rubik’s Cube</h2><svg viewBox="0 0 320 340" role="img" aria-label="A three-face 3 by 3 Rubik’s Cube. The selected physical piece is outlined on its visible stickers. Choose a sticker with mouse or keyboard."><title>Rubik’s Cube</title><defs><filter id="rubik-cube-shadow" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="13" stdDeviation="9" floodColor="#172626" floodOpacity=".25" /></filter></defs><g className="cube-body" filter="url(#rubik-cube-shadow)"><polygon points="160,28 300,90 160,150 20,90" className="cube-plane top" /><polygon points="20,90 160,150 160,310 20,250" className="cube-plane front" /><polygon points="160,150 300,90 300,250 160,310" className="cube-plane side" />{visibleFaces.map(face => <g key={face} className={`cube-face face-${face}`}>{faceNodes(state, face).map(node => { const [column, row] = gridPosition(face, node.position); const selected = node.cubieId === selectedId; const selectable = node.type !== 'center'; return <polygon key={node.id} points={cubeCellPoints(face, column, row)} className={`cube-sticker${selected ? ' selected' : ''}${affected.has(node.cubieId) ? ' affected' : ''}${selectable ? ' movable' : ''}`} fill={faceColors[node.color]} tabIndex={selectable ? 0 : undefined} role={selectable ? 'button' : undefined} aria-label={selectable ? `${colorNames[node.color]} sticker; ${cubieWords(cubieById(state, node.cubieId))} at ${naturalPosition(node.position)}` : `${colorNames[node.color]} fixed center`} onClick={selectable ? () => onSelect(node.cubieId) : undefined} onKeyDown={selectable ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.cubieId); } } : undefined} />; })}</g>)}{showTurn && turn && turnFace && turnCenter && <g key={turn.key} className="cube-turn-layer" style={{ '--turn-angle': `${turnAngle}deg`, transformOrigin: `${turnCenter[0]}px ${turnCenter[1]}px` } as CSSProperties}>{faceNodes(turn.before, turnFace).map(node => { const [column, row] = gridPosition(turnFace, node.position); return <polygon key={node.id} points={cubeCellPoints(turnFace, column, row)} fill={faceColors[node.color]} className={`cube-sticker${node.cubieId === selectedId ? ' selected' : ''}`} />; })}</g>}</g></svg></section>;
}

function MotionGraph({ state, history, selectedId, turn, reducedMotion, showTrail, onSelect }: { state: CubeState; history: Move[]; selectedId: string; turn: VisualTurn | null; reducedMotion: boolean; showTrail: boolean; onSelect: (id: string) => void }) {
  const tokens = pieceMapTokens(state);
  const moving = new Set(turn ? affectedCubieIds(turn.before, turn.move) : []);
  let cursor = solvedCube();
  const trail: Array<readonly [number, number]> = [pieceMapSlot(cubieById(cursor, selectedId)?.position || [1, 1, 1])];
  history.forEach(move => { cursor = applyMove(cursor, move); const piece = cubieById(cursor, selectedId); if (piece) trail.push(pieceMapSlot(piece.position)); });
  const from = turn && cubieById(turn.before, selectedId);
  const to = cubieById(state, selectedId);
  const showPath = Boolean(turn && from && to && moving.has(selectedId) && from.position.join(',') !== to?.position.join(','));
  return <section className="motion-graph" aria-label="Motion graph"><h2>Motion graph</h2><svg viewBox="0 0 400 400" role="img" aria-label="Twenty colored tokens orbit in one system: eight three-color corners and twelve two-color edges. Each token is the same physical piece as on the cube."><title>Motion graph of twenty physical cube pieces</title><circle cx="200" cy="200" r="154" className="orbit outer" /><circle cx="200" cy="200" r="104" className="orbit inner" /><circle cx="200" cy="200" r="46" className="orbit core" /><text x="200" y="194" textAnchor="middle" className="graph-center-label">SAME</text><text x="200" y="211" textAnchor="middle" className="graph-center-label">PIECES</text>{showTrail && trail.length > 1 && <polyline points={trail.slice(-5).map(point => point.join(',')).join(' ')} className="selected-trail" />}{showPath && from && to && <path d={`M ${pieceMapSlot(from.position).join(' ')} Q 200 200 ${pieceMapSlot(to.position).join(' ')}`} className="movement-path" />}{tokens.map(token => { const selected = token.id === selectedId; const old = turn && cubieById(turn.before, token.id); const oldSlot = old && pieceMapSlot(old.position); const changed = oldSlot && oldSlot.join(',') !== token.slot.join(','); return <g key={token.id} transform={`translate(${token.slot[0]} ${token.slot[1]})`} className={`piece-token${selected ? ' selected' : ''}${moving.has(token.id) ? ' moving' : ''}`} onClick={() => onSelect(token.id)} tabIndex={0} role="button" aria-label={`${token.colors.map(color => colorNames[color]).join(', ')} ${token.type} at ${naturalPosition(token.position)}`} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(token.id); } }}>{turn && oldSlot && changed && !reducedMotion && <animateTransform key={`${turn.key}-${token.id}`} attributeName="transform" type="translate" from={`${oldSlot[0]} ${oldSlot[1]}`} to={`${token.slot[0]} ${token.slot[1]}`} dur="1.08s" fill="freeze" />}{selected && <circle r="24" className="selected-halo" />}{token.colors.map((color, index) => <path key={color} d={sectorPath(index, token.colors.length, selected ? 17 : 14)} fill={faceColors[color]} className="token-segment" />)}<circle r={selected ? 17 : 14} className="token-outline" />{selected && <circle cx="14" cy="-14" r="5" className="identity-dot" />}</g>; })}</svg><p>One token = one physical piece.</p></section>;
}

function StickerView({ state, selectedId, onSelect }: { state: CubeState; selectedId: string; onSelect: (id: string) => void }) {
  const nodes = stickerNodes(state);
  return <svg className="sticker-view" viewBox="0 0 100 100" role="img" aria-label="Advanced view with all fifty-four visible cube stickers"><title>Advanced Sticker View</title>{faces.map(face => { const [x, y] = stickerFaceCenters[face]; return <g key={face}><circle cx={x} cy={y} r="10" className="sticker-territory" /><text x={x} y={y - 11.5} textAnchor="middle">{face}</text></g>; })}{nodes.map(node => { const [x, y] = stickerPoint(node.face, node.position); return <circle key={node.id} cx={x} cy={y} r={node.type === 'center' ? 3.1 : 2.5} fill={faceColors[node.color]} className={node.cubieId === selectedId ? 'advanced-selected' : ''} tabIndex={0} role="button" aria-label={`${colorNames[node.color]} sticker; ${cubieWords(cubieById(state, node.cubieId))}`} onClick={() => onSelect(node.cubieId)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.cubieId); } }} />; })}</svg>;
}
