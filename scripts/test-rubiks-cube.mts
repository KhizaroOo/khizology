import assert from 'node:assert/strict';
import { affectedCubieIds, applyMove, applySequence, cubeSignature, cubieById, deterministicScramble, faces, invertSequence, isSolved, solvedCube, stickerNodes, type Move } from '../src/components/infooo/rubiks/cubeEngine.ts';
import { pieceMapSlot, pieceMapTokens } from '../src/components/infooo/rubiks/pieceMap.ts';
import { oneTurnSequence, workingExamplePieceId, workingExampleSequence } from '../src/components/infooo/rubiks/rubikExperience.ts';

const solved = solvedCube();
assert.equal(solved.cubies.filter(cubie => cubie.type === 'corner').length, 8, 'eight corners');
assert.equal(solved.cubies.filter(cubie => cubie.type === 'edge').length, 12, 'twelve edges');
assert.equal(solved.cubies.filter(cubie => cubie.type === 'center').length, 6, 'six fixed centers');
assert.equal(stickerNodes(solved).length, 54, '54 visible facelets');
for (const face of faces) assert.equal(stickerNodes(solved).filter(node => node.face === face).length, 9, `${face} has nine stickers`);
for (const face of faces) assert.equal(cubeSignature(applySequence(solved, [face, face, face, face])), cubeSignature(solved), `${face} × 4 is identity`);
for (const face of faces) {
  const inverse = `${face}'` as Move;
  assert.equal(cubeSignature(applySequence(solved, [face, inverse])), cubeSignature(solved), `${face} plus inverse is identity`);
  assert.equal(cubeSignature(applySequence(solved, [`${face}2`, `${face}2`])), cubeSignature(solved), `${face}2 + ${face}2 is identity`);
}
const scramble = deterministicScramble();
assert.ok(scramble.every((move, index) => index === 0 || move[0] !== scramble[index - 1][0]), 'scramble avoids repeated face runs');
assert.ok(isSolved(applySequence(applySequence(solved, scramble), invertSequence(scramble))), 'scramble plus inverse returns solved');
assert.equal(workingExampleSequence.length, 7, 'working example uses a concise deterministic seven-move sequence');
assert.deepEqual(oneTurnSequence, ['R'], 'first lesson is exactly one right-face turn');
assert.ok(workingExampleSequence.every((move, index) => index === 0 || move[0] !== workingExampleSequence[index - 1][0]), 'working example avoids repeated-face noise');
assert.equal(workingExampleSequence.some((move, index) => index > 0 && move[0] === workingExampleSequence[index - 1][0] && move !== workingExampleSequence[index - 1]), false, 'working example avoids immediate inverse pairs');
assert.ok(isSolved(applySequence(solved, [...workingExampleSequence, ...invertSequence(workingExampleSequence)])), 'working example returns home through its inverse');
assert.equal(cubieById(solved, workingExamplePieceId)?.type, 'corner', 'working example auto-selects a real corner');
const afterR = applyMove(solved, 'R');
assert.deepEqual(cubieById(afterR, 'corner:FRU')?.position, [1, -1, 1], 'known R permutation: UFR corner moves to DFR');
assert.deepEqual(cubieById(afterR, 'edge:RU')?.position, [1, 0, 1], 'known R permutation: UR edge moves to FR');
for (const state of [solved, afterR, applySequence(solved, ['R', 'U', "R'", "U'"])]) {
  const nodes = stickerNodes(state);
  assert.equal(nodes.length, 54, 'moves preserve 54 nodes');
  assert.equal(new Set(nodes.map(node => node.cubieId)).size, 26, 'moves preserve every cubie identity');
  assert.equal(nodes.filter(node => node.type === 'edge').length, 24, 'edges expose two stickers each');
  assert.equal(nodes.filter(node => node.type === 'corner').length, 24, 'corners expose three stickers each');
  assert.equal(nodes.filter(node => node.type === 'center').length, 6, 'centers expose one sticker each');
  for (const face of faces) assert.equal(nodes.filter(node => node.face === face).length, 9, `${face} remains complete`);
  assert.equal(state.cubies.filter(cubie => cubie.type === 'center').every(cubie => cubie.position.join(',') === cubie.home.join(',')), true, 'centers remain fixed references');
}
assert.equal(affectedCubieIds(solved, 'R').length, 8, 'one face turn affects four corners and four edges');
const mapTokens = pieceMapTokens(solved);
assert.equal(mapTokens.length, 20, 'Piece Map contains exactly twenty movable physical cubies');
assert.equal(mapTokens.filter(token => token.type === 'corner').length, 8, 'Piece Map contains eight corner tokens');
assert.equal(mapTokens.filter(token => token.type === 'edge').length, 12, 'Piece Map contains twelve edge tokens');
assert.equal(new Set(mapTokens.map(token => token.id)).size, 20, 'Piece Map preserves every movable cubie identity');
assert.equal(new Set(mapTokens.map(token => token.slot.join(','))).size, 20, 'Piece Map gives every cubie a stable distinct slot');
const selectedBefore = pieceMapTokens(solved).find(token => token.id === workingExamplePieceId)!;
const selectedAfter = pieceMapTokens(afterR).find(token => token.id === workingExamplePieceId)!;
assert.deepEqual(selectedAfter.position, [1, -1, 1], 'Piece Map and cube share the URF to DRF position');
assert.deepEqual(selectedBefore.slot, pieceMapSlot([1, 1, 1]), 'Piece Map start slot is deterministic');
assert.deepEqual(selectedAfter.slot, pieceMapSlot([1, -1, 1]), 'Piece Map destination slot is deterministic');
console.log('Rubik engine and graph invariants passed.');
