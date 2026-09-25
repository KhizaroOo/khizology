import type { CubeState, Cubie, Face, Vec } from './cubeEngine';

export type PieceMapToken = {
  id: string;
  type: 'corner' | 'edge';
  colors: Face[];
  position: Vec;
  slot: readonly [number, number];
};

// One orbit for corners and one for edges. A slot belongs to a physical
// position, while the colored token keeps its cubie identity as it moves.
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

export function pieceMapTokens(state: CubeState): PieceMapToken[] {
  return state.cubies
    .filter((cubie): cubie is Cubie & { type: 'corner' | 'edge' } => cubie.type !== 'center')
    .map(cubie => ({
      id: cubie.id,
      type: cubie.type,
      colors: cubie.stickers.map(sticker => sticker.color),
      position: cubie.position,
      slot: pieceMapSlot(cubie.position),
    }));
}
