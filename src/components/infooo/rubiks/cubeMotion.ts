import { coordsForSize, faces, normals, parseMove, type CubeState, type Cubie, type Face, type Move, type Vec } from './cubeEngine.ts';

export const turnDuration = 1080;

// Six named presets -- Bottom is what makes the yellow (Down) face reachable at all; every other
// preset's pitch is positive, so Down's normal [0,-1,0] could never win the dot-product
// visibility test from Front/Right/Back/Left/Top alone (the original bug this fixed). Bottom
// mirrors Top's yaw at a negative pitch, looking up. These are now just entry points into a
// continuous camera -- see CameraAngle below -- kept as named jump-to shortcuts and as the
// vocabulary "Reveal piece" and the six preset buttons use.
export const viewpoints = ['Front', 'Right', 'Back', 'Left', 'Top', 'Bottom'] as const;
export type Viewpoint = typeof viewpoints[number];
const angles: Record<Viewpoint, readonly [number, number]> = {
  Front: [45, 30], Right: [135, 30], Back: [225, 30], Left: [315, 30], Top: [45, 80], Bottom: [45, -80],
};

// A free camera position -- degrees, not radians, so drag-sensitivity math stays readable.
// yaw wraps around the vertical axis (0-360, any value is valid, callers should normalize
// for display); pitch is conventionally clamped to roughly [-85, 85] by the caller to avoid a
// gimbal-like flip at the poles, but this module itself does not enforce that clamp.
export type CameraAngle = { yaw: number; pitch: number };
export type ViewInput = Viewpoint | CameraAngle;
export function presetAngle(view: Viewpoint): CameraAngle {
  const [yaw, pitch] = angles[view];
  return { yaw, pitch };
}
function toAngle(view: ViewInput): CameraAngle {
  return typeof view === 'string' ? presetAngle(view) : view;
}
// Which named preset best matches a (possibly free-dragged) angle -- used for display copy
// ("Visible from front") and for deciding which preset button, if any, should read as pressed.
export function nearestViewpoint(view: ViewInput): Viewpoint {
  if (typeof view === 'string') return view;
  const angle = view;
  return [...viewpoints].sort((a, b) => angleDistance(angle, presetAngle(a)) - angleDistance(angle, presetAngle(b)))[0];
}
export function isNearPreset(view: ViewInput, preset: Viewpoint, toleranceDegrees = 2): boolean {
  return angleDistance(toAngle(view), presetAngle(preset)) < toleranceDegrees;
}
function angleDistance(a: CameraAngle, b: CameraAngle): number {
  const yawDelta = Math.abs(((a.yaw - b.yaw + 540) % 360) - 180); // shortest angular distance, wraps correctly
  return Math.hypot(yawDelta, a.pitch - b.pitch);
}

const axes: Record<Face, 0 | 1 | 2> = { U: 1, D: 1, L: 0, R: 0, F: 2, B: 2 };
const clockwise: Record<Face, number> = { U: 1, D: -1, L: -1, R: 1, F: -1, B: 1 };
const dot = (a: Vec, b: Vec) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec, n: number): Vec => [a[0] * n, a[1] * n, a[2] * n];

function camera(view: ViewInput) {
  const { yaw: yawDeg, pitch: pitchDeg } = toAngle(view);
  const yaw = yawDeg * Math.PI / 180;
  const pitch = pitchDeg * Math.PI / 180;
  const right: Vec = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up: Vec = [-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), -Math.cos(yaw) * Math.sin(pitch)];
  const toward: Vec = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  return { right, up, toward };
}

// Rendering only: fractional rotation lands on the canonical engine's exact turn.
// Tests compare every face/direction endpoint against applyMove; no state is stored here.
export function turnPoint(point: Vec, move: Move, progress: number): Vec {
  const { face, turns, direction } = parseMove(move);
  const angle = clockwise[face] * direction * turns * Math.PI / 2 * progress;
  const [x, y, z] = point;
  const c = Math.cos(angle), s = Math.sin(angle);
  if (axes[face] === 0) return [x, y * c - z * s, y * s + z * c];
  if (axes[face] === 1) return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
}

export function pieceVisible(piece: Cubie, view: ViewInput) {
  return piece.stickers.some(sticker => dot(sticker.normal, camera(view).toward) > .001);
}

export function revealView(piece: Cubie): Viewpoint {
  return [...viewpoints].sort((a, b) =>
    dot(piece.position, camera(b).toward) - dot(piece.position, camera(a).toward),
  )[0];
}

export type CubeSurface = { id: string; cubieId: string; points: string; stickerPoints: string; color?: Face; depth: number };

export function cubeSurfaces(state: CubeState, view: ViewInput, move?: Move, progress = 1): CubeSurface[] {
  const basis = camera(view);
  // Normalize by this cube's own half-width so every size (0.5 for 2x2, 1 for 3x3, 1.5 for 4x4)
  // fills the same visual envelope 3x3 already used -- at size 3 halfExtent is exactly 1, so this
  // is a no-op and projected coordinates are byte-identical to before.
  const halfExtent = coordsForSize(state.size).at(-1)!;
  const project = (point: Vec) => {
    const normalized: Vec = [point[0] / halfExtent, point[1] / halfExtent, point[2] / halfExtent];
    return `${(160 + dot(normalized, basis.right) * 61).toFixed(2)},${(177 - dot(normalized, basis.up) * 61).toFixed(2)}`;
  };
  const result: CubeSurface[] = [];
  const turnFace = move?.[0] as Face | undefined;
  const turnAxisValue = turnFace ? normals[turnFace][axes[turnFace]] * halfExtent : undefined;
  for (const cubie of state.cubies) {
    const moving = turnFace && turnAxisValue !== undefined && cubie.position[axes[turnFace]] === turnAxisValue;
    const transform = (point: Vec) => moving && move ? turnPoint(point, move, progress) : point;
    for (const face of faces) {
      const normal = normals[face];
      if (dot(transform(normal), basis.toward) <= .001) continue;
      const across: Vec = normal[0] ? [0, 0, 1] : [1, 0, 0];
      const down: Vec = normal[1] ? [0, 0, 1] : [0, 1, 0];
      // Each cubie is always exactly one unit wide regardless of size -- only project()'s
      // halfExtent division makes a bigger cube's cubies read as proportionally smaller.
      const center = add(cubie.position, scale(normal, .49));
      const corners = (size: number) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) =>
        project(transform(add(center, add(scale(across, x * size), scale(down, y * size))))),
      ).join(' ');
      const sticker = cubie.stickers.find(item => dot(item.normal, normal) > .99);
      result.push({ id: `${cubie.id}:${face}`, cubieId: cubie.id, points: corners(.49), stickerPoints: corners(.425), color: sticker?.color, depth: dot(transform(center), basis.toward) });
    }
  }
  return result.sort((a, b) => a.depth - b.depth);
}

export function graphMotionPoint(from: readonly [number, number], to: readonly [number, number], progress: number): readonly [number, number] {
  if (from[0] === to[0] && from[1] === to[1]) return to;
  const left = 1 - progress;
  return [left * left * from[0] + 2 * left * progress * 200 + progress * progress * to[0], left * left * from[1] + 2 * left * progress * 200 + progress * progress * to[1]];
}
