export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type Move = `${Face}` | `${Face}'` | `${Face}2`;
export type Vec = readonly [number, number, number];
export type Sticker = { id: string; color: Face; normal: Vec };
export type Cubie = { id: string; type: 'corner' | 'edge' | 'center'; home: Vec; position: Vec; stickers: Sticker[] };
export type CubeState = { cubies: Cubie[] };

export const faces: Face[] = ['U', 'D', 'L', 'R', 'F', 'B'];
export const faceColors: Record<Face, string> = { U: '#f8f8f4', D: '#ffd43b', L: '#ff8b32', R: '#ef476f', F: '#35b779', B: '#4dabf7' };
export const normals: Record<Face, Vec> = { U: [0, 1, 0], D: [0, -1, 0], L: [-1, 0, 0], R: [1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };
const axis: Record<Face, 0 | 1 | 2> = { U: 1, D: 1, L: 0, R: 0, F: 2, B: 2 };
const layer: Record<Face, number> = { U: 1, D: -1, L: -1, R: 1, F: 1, B: -1 };
const clockwise: Record<Face, 1 | -1> = { R: 1, L: -1, U: 1, D: -1, F: -1, B: 1 };

const eq = (a: Vec, b: Vec) => a.every((value, index) => value === b[index]);
const faceForNormal = (normal: Vec) => faces.find(face => eq(normals[face], normal))!;
const rotate = (vector: Vec, around: 0 | 1 | 2, direction: 1 | -1): Vec => {
  const [x, y, z] = vector;
  const normalized = ([a, b, c]: Vec): Vec => [a === 0 ? 0 : a, b === 0 ? 0 : b, c === 0 ? 0 : c];
  if (around === 0) return normalized(direction === 1 ? [x, -z, y] : [x, z, -y]);
  if (around === 1) return normalized(direction === 1 ? [z, y, -x] : [-z, y, x]);
  return normalized(direction === 1 ? [-y, x, z] : [y, -x, z]);
};

function createCubie(position: Vec): Cubie {
  const stickers = faces.filter(face => normals[face].some((value, index) => value !== 0 && position[index] === value)).map(face => ({ id: `${position.join(',')}:${face}`, color: face, normal: normals[face] }));
  const type = stickers.length === 3 ? 'corner' : stickers.length === 2 ? 'edge' : 'center';
  return { id: `${type}:${stickers.map(sticker => sticker.color).sort().join('')}`, type, home: position, position, stickers };
}

export function solvedCube(): CubeState {
  const cubies: Cubie[] = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) cubies.push(createCubie([x, y, z]));
  return { cubies };
}

export function parseMove(move: Move) { const face = move[0] as Face; return { face, turns: move.endsWith('2') ? 2 : 1, direction: (move.endsWith("'") ? -1 : 1) as 1 | -1 }; }
export function moveLabel(move: Move) { const { face, turns, direction } = parseMove(move); return `${face}${turns === 2 ? ' double turn' : direction === -1 ? ' counter-clockwise turn' : ' clockwise turn'}`; }
export function moveDescription(move: Move) { const { face, turns, direction } = parseMove(move); const words: Record<Face, string> = { U: 'upper', D: 'down', L: 'left', R: 'right', F: 'front', B: 'back' }; return `Turn the ${words[face]} face ${turns === 2 ? 'twice' : direction === -1 ? 'counter-clockwise' : 'clockwise'}. Four corners and four edges change position; fixed centers keep the face reference.`; }

export function applyMove(state: CubeState, move: Move): CubeState {
  const { face, turns, direction } = parseMove(move); let next = structuredClone(state);
  for (let turn = 0; turn < turns; turn++) {
    next = { cubies: next.cubies.map(cubie => {
      if (cubie.type === 'center' || cubie.position[axis[face]] !== layer[face]) return cubie;
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
export function movableCubies(state: CubeState) { return state.cubies.filter(cubie => cubie.type !== 'center'); }
export function affectedCubieIds(state: CubeState, move: Move) { const { face } = parseMove(move); return state.cubies.filter(cubie => cubie.type !== 'center' && cubie.position[axis[face]] === layer[face]).map(cubie => cubie.id); }
export function positionName(position: Vec) { const labels = [position[1] === 1 ? 'U' : position[1] === -1 ? 'D' : '', position[0] === 1 ? 'R' : position[0] === -1 ? 'L' : '', position[2] === 1 ? 'F' : position[2] === -1 ? 'B' : ''].join(''); return labels || 'core'; }
export function stickerNodes(state: CubeState) { return state.cubies.flatMap(cubie => cubie.stickers.map(sticker => ({ id: `${cubie.id}:${sticker.color}`, cubieId: cubie.id, color: sticker.color, face: faceForNormal(sticker.normal), position: cubie.position, type: cubie.type }))); }
export function deterministicScramble(length = 12, seed = 0x2f6e2b1) { let value = seed >>> 0; const result: Move[] = []; let last = ''; while (result.length < length) { value = (value * 1664525 + 1013904223) >>> 0; const face = faces[value % faces.length]; value = (value * 1664525 + 1013904223) >>> 0; const suffix = ['', "'", '2'][value % 3]; if (face !== last) { result.push(`${face}${suffix}` as Move); last = face; } } return result; }
export function cubeSignature(state: CubeState) { return state.cubies.slice().sort((a, b) => a.id.localeCompare(b.id)).map(cubie => `${cubie.id}@${cubie.position.join('')}:${cubie.stickers.slice().sort((a, b) => a.color.localeCompare(b.color)).map(sticker => `${sticker.color}${sticker.normal.join('')}`).join('|')}`).join(';'); }
