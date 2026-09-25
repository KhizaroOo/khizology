import { faces, solvedCube, type CubeState, type Cubie, type CubieType, type Face, type Vec } from './cubeEngine.ts';

export type PieceMapToken = {
  id: string;
  type: CubieType;
  colors: Face[];
  position: Vec;
  slot: readonly [number, number];
};

// Flagship 3x3 layout, unchanged: one ring for corners, one for edges. A slot belongs to a
// physical position, while the colored token keeps its cubie identity as it moves.
const cornerAngles: Record<string, number> = {
  '-1,1,-1': -135, '-1,1,1': -90, '1,1,1': -45, '1,1,-1': 0,
  '1,-1,-1': 45, '1,-1,1': 90, '-1,-1,1': 135, '-1,-1,-1': 180,
};
const edgeAngles: Record<string, number> = {
  '0,1,1': -90, '1,1,0': -60, '1,0,-1': -30, '0,1,-1': 0,
  '-1,0,-1': 30, '-1,1,0': 60, '-1,0,1': 90, '0,-1,1': 120,
  '-1,-1,0': 150, '0,-1,-1': 180, '1,-1,0': 210, '1,0,1': 240,
};
export function pieceMapSlot(position: Vec): readonly [number, number] {
  const key = position.join(',');
  const corner = position.every(value => value !== 0);
  const degrees = corner ? cornerAngles[key] : edgeAngles[key];
  if (degrees === undefined) throw new Error(`No motion graph slot for ${key}`);
  const radians = degrees * Math.PI / 180;
  const radius = corner ? 154 : 104;
  return [200 + Math.cos(radians) * radius, 200 + Math.sin(radians) * radius] as const;
}

// Sizes other than 3 need their own layout: 2x2 only has the corner ring (reused directly --
// every size's 8 corners share the same sign pattern regardless of magnitude, so the flagship
// corner angles already apply). 4x4 adds a middle ring of 24 edge-wings and an inner ring of 24
// centers (brief section 53: outer=corners, middle=edge-wings, inner=centers), grouped by which
// physical orbit (which face or face-pair) each piece belongs to so the graph reads as pieces
// clustered by role, not scattered.
const sign = (value: number) => (value > 0 ? 1 : value < 0 ? -1 : 0);
const signKey = (position: Vec) => position.map(sign).join(',');

function cornerSlot(position: Vec): readonly [number, number] {
  const degrees = cornerAngles[signKey(position)];
  const radians = degrees * Math.PI / 180;
  return [200 + Math.cos(radians) * 168, 200 + Math.sin(radians) * 168] as const;
}

function ringSlot(orbitIndex: number, orbitCount: number, memberIndex: number, memberCount: number, radius: number, spreadDegrees: number): readonly [number, number] {
  const baseDegrees = -90 + (orbitIndex / orbitCount) * 360;
  const spread = memberCount > 1 ? (memberIndex - (memberCount - 1) / 2) * (spreadDegrees / Math.max(1, memberCount - 1)) : 0;
  const radians = (baseDegrees + spread) * Math.PI / 180;
  return [200 + Math.cos(radians) * radius, 200 + Math.sin(radians) * radius] as const;
}

const orbitKeyOf = (cubie: Pick<Cubie, 'stickers'>) => cubie.stickers.map(sticker => sticker.color).sort().join('');
// Derived from the real flagship cube rather than hand-typed, so the 12 edge orbits can never
// drift out of sync with what the engine actually produces.
const EDGE_ORBIT_KEYS = solvedCube(3).cubies.filter(cubie => cubie.type === 'edge').map(orbitKeyOf);

function pieceMapTokensForSize(state: CubeState): PieceMapToken[] {
  const movable = state.cubies.filter(cubie => cubie.type !== 'center' || state.size === 4);
  const corners = movable.filter(cubie => cubie.type === 'corner');
  const edges = movable.filter(cubie => cubie.type === 'edge');
  const centers = movable.filter(cubie => cubie.type === 'center');
  const byHome = (a: Cubie, b: Cubie) => a.home.join(',').localeCompare(b.home.join(','));

  const tokens: PieceMapToken[] = corners.map(cubie => ({ id: cubie.id, type: cubie.type, colors: cubie.stickers.map(s => s.color), position: cubie.position, slot: cornerSlot(cubie.position) }));

  // Pushed well clear of the corner ring (168) and given a wide enough spread that the two
  // wings sharing an orbit don't visually merge -- 24 tokens at radius 142 leaves ~19px between
  // token edges even at the tightest neighboring-orbit point (was overlapping at radius 118).
  EDGE_ORBIT_KEYS.forEach((key, orbitIndex) => {
    const members = edges.filter(cubie => orbitKeyOf(cubie) === key).sort(byHome);
    members.forEach((cubie, memberIndex) => tokens.push({
      id: cubie.id, type: cubie.type, colors: cubie.stickers.map(s => s.color), position: cubie.position,
      slot: ringSlot(orbitIndex, EDGE_ORBIT_KEYS.length, memberIndex, members.length, 142, 22),
    }));
  });

  faces.forEach((face, orbitIndex) => {
    const members = centers.filter(cubie => cubie.stickers[0]?.color === face).sort(byHome);
    members.forEach((cubie, memberIndex) => tokens.push({
      id: cubie.id, type: cubie.type, colors: cubie.stickers.map(s => s.color), position: cubie.position,
      slot: ringSlot(orbitIndex, faces.length, memberIndex, members.length, 80, 40),
    }));
  });

  return tokens;
}

export function pieceMapTokens(state: CubeState): PieceMapToken[] {
  if (state.size === 3) {
    return state.cubies
      .filter((cubie): cubie is Cubie & { type: 'corner' | 'edge' } => cubie.type !== 'center')
      .map(cubie => ({ id: cubie.id, type: cubie.type, colors: cubie.stickers.map(sticker => sticker.color), position: cubie.position, slot: pieceMapSlot(cubie.position) }));
  }
  return pieceMapTokensForSize(state);
}
