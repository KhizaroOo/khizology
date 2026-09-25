export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type Move = `${Face}` | `${Face}'` | `${Face}2`;
export type Vec = readonly [number, number, number];
export type CubeSize = 2 | 3 | 4;
export type Sticker = { id: string; color: Face; normal: Vec };
export type CubieType = 'corner' | 'edge' | 'center';
export type Cubie = { id: string; type: CubieType; home: Vec; position: Vec; stickers: Sticker[] };
export type CubeState = { size: CubeSize; cubies: Cubie[] };

export const faces: Face[] = ['U', 'D', 'L', 'R', 'F', 'B'];
export const faceColors: Record<Face, string> = { U: '#f8f8f4', D: '#ffd43b', L: '#ff8b32', R: '#ef476f', F: '#35b779', B: '#4dabf7' };
export const normals: Record<Face, Vec> = { U: [0, 1, 0], D: [0, -1, 0], L: [-1, 0, 0], R: [1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };
const axis: Record<Face, 0 | 1 | 2> = { U: 1, D: 1, L: 0, R: 0, F: 2, B: 2 };
const sign: Record<Face, 1 | -1> = { U: 1, D: -1, L: -1, R: 1, F: 1, B: -1 };
const clockwise: Record<Face, 1 | -1> = { R: 1, L: -1, U: 1, D: -1, F: -1, B: 1 };

// Truthful per-size structure (docs/INFOOO-RUBIKS-CUBE-MOTION-GRAPH.md "Size truth"):
// 2x2 -> 8 corners, no edges, no fixed centers. 3x3 -> 8 corners, 12 edges, 6 fixed-reference
// centers (flagship, unchanged). 4x4 -> 8 corners, 24 movable edge-wings, 24 movable centers,
// no single fixed center per face. Coordinates are evenly spaced, centered on zero; size 3 keeps
// the exact legacy [-1,0,1] so every existing id/position/test stays byte-identical.
export function coordsForSize(size: CubeSize): number[] {
  const start = -(size - 1) / 2;
  return Array.from({ length: size }, (_, index) => start + index);
}

const eq = (a: Vec, b: Vec) => a.every((value, index) => value === b[index]);
const faceForNormal = (normal: Vec) => faces.find(face => eq(normals[face], normal))!;
const rotate = (vector: Vec, around: 0 | 1 | 2, direction: 1 | -1): Vec => {
  const [x, y, z] = vector;
  const normalized = ([a, b, c]: Vec): Vec => [a === 0 ? 0 : a, b === 0 ? 0 : b, c === 0 ? 0 : c];
  if (around === 0) return normalized(direction === 1 ? [x, -z, y] : [x, z, -y]);
  if (around === 1) return normalized(direction === 1 ? [z, y, -x] : [-z, y, x]);
  return normalized(direction === 1 ? [-y, x, z] : [y, -x, z]);
};

// A sticker exists on face F iff the cubie sits at F's extreme coordinate on F's axis --
// generalizes the old "position[index] === value" check (which only worked at magnitude 1)
// to any evenly spaced coordinate set.
function stickerFacesFor(position: Vec, coords: number[]): Face[] {
  const min = coords[0];
  const max = coords[coords.length - 1];
  return faces.filter(face => position[axis[face]] === (sign[face] === 1 ? max : min));
}

// Corner ids are always unique by color-set alone (any size). Edge/center ids collide once a
// size has more than one physical piece per color-set (4x4's paired edge-wings, quad centers) --
// disambiguate with the fixed home position ONLY then, so size 2/3 ids stay byte-identical to
// the original scheme that tests and the component already depend on (e.g. "edge:RU").
function cubieId(type: CubieType, stickers: Sticker[], home: Vec, size: CubeSize): string {
  const colorPart = stickers.map(sticker => sticker.color).sort().join('');
  if (type === 'corner' || size !== 4) return `${type}:${colorPart}`;
  return `${type}:${colorPart}:${home.join(',')}`;
}

function createCubie(position: Vec, size: CubeSize): Cubie {
  const coords = coordsForSize(size);
  const stickers = stickerFacesFor(position, coords).map(face => ({ id: `${position.join(',')}:${face}`, color: face, normal: normals[face] }));
  const type: CubieType = stickers.length === 3 ? 'corner' : stickers.length === 2 ? 'edge' : 'center';
  return { id: cubieId(type, stickers, position, size), type, home: position, position, stickers };
}

export function solvedCube(size: CubeSize = 3): CubeState {
  const coords = coordsForSize(size);
  const interior = coords.slice(1, -1); // values that are neither this size's min nor max
  const cubies: Cubie[] = [];
  for (const x of coords) for (const y of coords) for (const z of coords) {
    if (interior.includes(x) && interior.includes(y) && interior.includes(z)) continue; // hidden core, never visible
    cubies.push(createCubie([x, y, z], size));
  }
  return { size, cubies };
}

export function parseMove(move: Move) { const face = move[0] as Face; return { face, turns: move.endsWith('2') ? 2 : 1, direction: (move.endsWith("'") ? -1 : 1) as 1 | -1 }; }
export function moveLabel(move: Move) { const { face, turns, direction } = parseMove(move); return `${face}${turns === 2 ? ' double turn' : direction === -1 ? ' counter-clockwise turn' : ' clockwise turn'}`; }
export function moveDescription(move: Move, size: CubeSize = 3) {
  const { face, turns, direction } = parseMove(move);
  const words: Record<Face, string> = { U: 'upper', D: 'down', L: 'left', R: 'right', F: 'front', B: 'back' };
  const turnWord = turns === 2 ? 'twice' : direction === -1 ? 'counter-clockwise' : 'clockwise';
  if (size === 3) return `Turn the ${words[face]} face ${turnWord}. Four corners and four edges change position; fixed centers keep the face reference.`;
  if (size === 2) return `Turn the ${words[face]} face ${turnWord}. Four corner pieces change position -- a 2x2 has no edges or fixed centers.`;
  return `Turn the ${words[face]} face ${turnWord}. This is a single outer-layer turn: the two corners, two edge-wings per side, and four center pieces on that face move; the inner layer stays put.`;
}

// Only the outermost layer on each side moves -- a single outer face turn, never a wide/slice
// move. For size 3 the outer coordinate is also the only non-center coordinate, so this is
// exactly the legacy behavior. Centers are no longer hardcoded as immovable: for a piece sitting
// exactly on the turn axis (both other coordinates zero, size 3's fixed centers) the rotation is
// a mathematical no-op, so removing that special case changes nothing for size 3 while letting
// size 4's genuinely movable center pieces rotate correctly -- verified by the size-3 test suite
// staying green and by size-4 invariant tests added alongside this change.
export function applyMove(state: CubeState, move: Move): CubeState {
  const { face, turns, direction } = parseMove(move);
  const coords = coordsForSize(state.size);
  const layerValue = sign[face] === 1 ? coords[coords.length - 1] : coords[0];
  let next = structuredClone(state);
  for (let turn = 0; turn < turns; turn++) {
    next = { size: next.size, cubies: next.cubies.map(cubie => {
      if (cubie.position[axis[face]] !== layerValue) return cubie;
      const directionForFace = (clockwise[face] * direction) as 1 | -1;
      return { ...cubie, position: rotate(cubie.position, axis[face], directionForFace), stickers: cubie.stickers.map(sticker => ({ ...sticker, normal: rotate(sticker.normal, axis[face], directionForFace) })) };
    }) };
  }
  return next;
}
export function applySequence(state: CubeState, moves: readonly Move[]) { return moves.reduce(applyMove, state); }
export function invertMove(move: Move): Move { return move.endsWith('2') ? move : (move.endsWith("'") ? move[0] : `${move}'`) as Move; }
export function invertSequence(moves: readonly Move[]) { return [...moves].reverse().map(invertMove); }
export function isSolved(state: CubeState) { return state.cubies.every(cubie => eq(cubie.position, cubie.home) && cubie.stickers.every(sticker => eq(sticker.normal, normals[sticker.color]))); }
export function cubieById(state: CubeState, id?: string) { return state.cubies.find(cubie => cubie.id === id); }
export function movableCubies(state: CubeState) { return state.cubies.filter(cubie => cubie.type !== 'center' || state.size === 4); }
// "Affected" means visibly, meaningfully in motion -- a size-3 fixed center sits exactly on the
// turn axis and is a geometric no-op (see applyMove's comment), so it's excluded here exactly as
// it always was; a size-4 center is genuinely displaced within its face and counts.
export function affectedCubieIds(state: CubeState, move: Move) {
  const { face } = parseMove(move);
  const coords = coordsForSize(state.size);
  const layerValue = sign[face] === 1 ? coords[coords.length - 1] : coords[0];
  return state.cubies
    .filter(cubie => (cubie.type !== 'center' || state.size === 4) && cubie.position[axis[face]] === layerValue)
    .map(cubie => cubie.id);
}
export function positionName(position: Vec) { const labels = [position[1] > 0 ? 'U' : position[1] < 0 ? 'D' : '', position[0] > 0 ? 'R' : position[0] < 0 ? 'L' : '', position[2] > 0 ? 'F' : position[2] < 0 ? 'B' : ''].join(''); return labels || 'core'; }
export function stickerNodes(state: CubeState) { return state.cubies.flatMap(cubie => cubie.stickers.map(sticker => ({ id: `${cubie.id}:${sticker.color}`, cubieId: cubie.id, color: sticker.color, face: faceForNormal(sticker.normal), position: cubie.position, type: cubie.type }))); }

export function deterministicScramble(length = 12, seed = 0x2f6e2b1) { let value = seed >>> 0; const result: Move[] = []; let last = ''; while (result.length < length) { value = (value * 1664525 + 1013904223) >>> 0; const face = faces[value % faces.length]; value = (value * 1664525 + 1013904223) >>> 0; const suffix = ['', "'", '2'][value % 3]; if (face !== last) { result.push(`${face}${suffix}` as Move); last = face; } } return result; }

const SCRAMBLE_LENGTH: Record<CubeSize, number> = { 2: 12, 3: 21, 4: 32 };

// A real, non-seeded scramble for the "Randomize Cube" control (§22-23 of the brief): produced
// only through legal moves from solved state, never by inventing sticker colors directly, so
// every generated position is guaranteed reachable and reversible. Avoids an immediate same-face
// repeat and an immediate move/inverse cancellation (X then X', or X then X2 then implicitly
// undoing X) so the visible scramble always looks meaningfully different from solved.
export function randomScramble(size: CubeSize, length = SCRAMBLE_LENGTH[size]): Move[] {
  const result: Move[] = [];
  let lastFace: Face | null = null;
  while (result.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];
    if (face === lastFace) continue;
    const suffix = ['', "'", '2'][Math.floor(Math.random() * 3)];
    result.push(`${face}${suffix}` as Move);
    lastFace = face;
  }
  return result;
}

export function cubeSignature(state: CubeState) { return state.cubies.slice().sort((a, b) => a.id.localeCompare(b.id)).map(cubie => `${cubie.id}@${cubie.position.join('')}:${cubie.stickers.slice().sort((a, b) => a.color.localeCompare(b.color)).map(sticker => `${sticker.color}${sticker.normal.join('')}`).join('|')}`).join(';'); }

// Truthful per-size counts, derived (never hardcoded) so UI copy can't silently drift from the
// actual model. Formula for visible facelets on any size: 6 * size^2 (docs §41-42).
export function cubeCounts(size: CubeSize) {
  const cube = solvedCube(size);
  const corners = cube.cubies.filter(c => c.type === 'corner').length;
  const edges = cube.cubies.filter(c => c.type === 'edge').length;
  const centers = cube.cubies.filter(c => c.type === 'center').length;
  const stickers = stickerNodes(cube).length;
  return { corners, edges, centers, movable: corners + edges + (size === 4 ? centers : 0), stickers, expectedStickers: 6 * size * size };
}
