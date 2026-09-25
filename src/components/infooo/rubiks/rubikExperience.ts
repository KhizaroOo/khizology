import type { Move } from './cubeEngine';

// Kept local to World 002 so the teaching sequence never becomes generic Infooo state.
export const oneTurnSequence: readonly Move[] = ['R'];
export const workingExampleSequence: readonly Move[] = ['R', 'U', "F'", 'L', 'D', "B'", 'U'];
export const workingExamplePieceId = 'corner:FRU';
