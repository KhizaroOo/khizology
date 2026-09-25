import { invertSequence, randomScramble, type CubeSize, type Move } from './cubeEngine.ts';

// Kept local to World 002 so the teaching sequence never becomes generic Infooo state.
// The curated flagship example stays 3x3-only -- it names a specific, real corner
// (FRU) that only exists at that size, and is the seven-move "See one turn" / "Trace
// one piece" lesson. Live Solve at any size (including 3x3, via "Randomize Cube") uses
// a fresh randomScramble() instead -- see startDemo('solve') in the component.
export const oneTurnSequence: readonly Move[] = ['R'];
export const workingExampleSequence: readonly Move[] = ['R', 'U', "F'", 'L', 'D', "B'", 'U'];
export const workingExamplePieceId = 'corner:FRU';
export const liveSolveSequence: readonly Move[] = [...workingExampleSequence, ...invertSequence(workingExampleSequence)];

export const cubeSizes: readonly CubeSize[] = [2, 3, 4];
export const defaultCubeSize: CubeSize = 3;

export function newScramble(size: CubeSize): Move[] {
  return randomScramble(size);
}
