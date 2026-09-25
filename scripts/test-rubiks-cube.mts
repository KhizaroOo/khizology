import assert from 'node:assert/strict';
import { affectedCubieIds, applyMove, applySequence, coordsForSize, cubeCounts, cubeSignature, cubieById, deterministicScramble, faces, invertSequence, isSolved, randomScramble, solvedCube, stickerNodes, type CubeSize, type Move } from '../src/components/infooo/rubiks/cubeEngine.ts';
import { pieceMapSlot, pieceMapTokens } from '../src/components/infooo/rubiks/pieceMap.ts';
import { liveSolveSequence, oneTurnSequence, workingExamplePieceId, workingExampleSequence } from '../src/components/infooo/rubiks/rubikExperience.ts';
import { cubeSurfaces, graphMotionPoint, pieceVisible, revealView, turnPoint, viewpoints } from '../src/components/infooo/rubiks/cubeMotion.ts';

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
assert.equal(isSolved(applySequence(solved, workingExampleSequence)), false, 'live example has a genuinely scrambled midpoint');
assert.equal(cubeSignature(applySequence(solved, liveSolveSequence)), cubeSignature(solved), 'live solve restores position AND orientation');
for (let step = 1; step <= liveSolveSequence.length; step++) {
  const state = applySequence(solved, liveSolveSequence.slice(0, step));
  assert.equal(cubeSignature(applySequence(state, invertSequence([liveSolveSequence[step - 1]]))), cubeSignature(applySequence(solved, liveSolveSequence.slice(0, step - 1))), 'Previous returns the exact preceding playback state');
}
const close = (a: readonly number[], b: readonly number[]) => a.every((value, index) => Math.abs(value - b[index]) < 1e-9);
for (const face of faces) for (const suffix of ['', "'", '2']) {
  const move = `${face}${suffix}` as Move;
  const next = applyMove(solved, move);
  for (const id of affectedCubieIds(solved, move)) {
    const before = cubieById(solved, id)!;
    const after = cubieById(next, id)!;
    assert.ok(close(turnPoint(before.position, move, 1), after.position), `${move}: visual position lands on canonical state`);
    for (const sticker of before.stickers) assert.ok(close(turnPoint(sticker.normal, move, 1), after.stickers.find(item => item.color === sticker.color)!.normal), `${move}: visual sticker orientation lands on canonical state`);
  }
}
assert.equal(pieceVisible(cubieById(solved, 'edge:BL')!, 'Front'), false, 'left-back edge is hidden from front');
assert.equal(pieceVisible(cubieById(solved, 'edge:BL')!, 'Back'), true, 'left-back edge is visible from back');
for (const state of [solved, applySequence(solved, workingExampleSequence)]) {
  const signature = cubeSignature(state);
  for (const piece of state.cubies.filter(piece => piece.type !== 'center')) assert.ok(pieceVisible(piece, revealView(piece)), 'every hidden piece has a truthful reveal viewpoint');
  for (const view of viewpoints) {
    const surfaces = cubeSurfaces(state, view);
    assert.equal(surfaces.filter(surface => surface.color).length, 27, `${view}: three visible faces have 27 stickers`);
    assert.ok(surfaces.every(surface => !/NaN|Infinity/.test(surface.points)), `${view}: finite projected geometry`);
  }
  assert.equal(cubeSignature(state), signature, 'viewpoint changes do not mutate cube state');
}
assert.deepEqual(graphMotionPoint([0, 10], [90, 80], 0), [0, 10], 'graph motion starts at old position');
assert.deepEqual(graphMotionPoint([0, 10], [90, 80], 1), [90, 80], 'graph motion ends at new position');
assert.deepEqual(graphMotionPoint([25, 25], [25, 25], .5), [25, 25], 'unaffected token stays stationary');

// Regression guard for the "yellow never visible" bug: at least one of the six viewpoints must
// expose every one of the six colors, not just five. This would have caught the original bug
// (only five viewpoints existed, all with positive pitch, so D's normal could never win the
// dot-product visibility test) -- the earlier per-viewpoint "27 stickers = three faces" check
// above does not, by itself, guarantee full six-color coverage across the viewpoint set.
assert.deepEqual([...viewpoints], ['Front', 'Right', 'Back', 'Left', 'Top', 'Bottom'], 'all six canonical viewpoints exist');
{
  const reachableColors = new Set<string>();
  for (const view of viewpoints) for (const surface of cubeSurfaces(solved, view)) if (surface.color) reachableColors.add(surface.color);
  for (const face of faces) assert.ok(reachableColors.has(face), `${face} sticker is visible from at least one of the six viewpoints`);
}

// --- Multi-size structure, color, randomization, live-solve and sticker-mapping tests -------
// Truth boundaries per size (docs/INFOOO-RUBIKS-CUBE-MOTION-GRAPH.md "Size truth"):
//   2x2 -> 8 corners, no edges, no centers, 24 stickers.
//   3x3 -> 8 corners, 12 edges, 6 fixed-reference centers, 54 stickers (flagship, unchanged above).
//   4x4 -> 8 corners, 24 movable edge-wings, 24 movable centers, 96 stickers, no single fixed
//          center per face.
for (const size of [2, 3, 4] as CubeSize[]) {
  const solvedAtSize = solvedCube(size);
  const counts = cubeCounts(size);
  const expectedStructure: Record<CubeSize, { corners: number; edges: number; centers: number; movable: number }> = {
    2: { corners: 8, edges: 0, centers: 0, movable: 8 },
    3: { corners: 8, edges: 12, centers: 6, movable: 20 },
    4: { corners: 8, edges: 24, centers: 24, movable: 56 },
  };
  const expected = expectedStructure[size];
  assert.equal(counts.corners, expected.corners, `${size}x${size}: ${expected.corners} corners`);
  assert.equal(counts.edges, expected.edges, `${size}x${size}: ${expected.edges} edges`);
  assert.equal(counts.centers, expected.centers, `${size}x${size}: ${expected.centers} centers`);
  assert.equal(counts.movable, expected.movable, `${size}x${size}: ${expected.movable} movable pieces (motion graph token count)`);

  // Sticker formula 6 * N^2, and exactly N^2 of each of the six colors -- never hardcoded.
  assert.equal(counts.stickers, 6 * size * size, `${size}x${size}: 6*N^2 = ${6 * size * size} visible stickers`);
  const nodesAtSize = stickerNodes(solvedAtSize);
  for (const face of faces) assert.equal(nodesAtSize.filter(node => node.color === face).length, size * size, `${size}x${size}: color ${face} has exactly ${size * size} stickers`);

  // Every cubie id is unique -- guards the 4x4 edge-wing / center disambiguation logic
  // specifically (colors alone collide for those two types at size 4).
  const ids = solvedAtSize.cubies.map(cubie => cubie.id);
  assert.equal(new Set(ids).size, ids.length, `${size}x${size}: all ${ids.length} cubie ids are unique`);

  // 4x4 centers must be genuinely movable (not hardcoded fixed like 3x3's), and must not claim a
  // single center per face the way the 3x3 model does.
  if (size === 4) {
    const rMove = applyMove(solvedAtSize, 'R');
    const rCenters = solvedAtSize.cubies.filter(cubie => cubie.type === 'center' && cubie.position[0] === coordsForSize(4).at(-1));
    assert.equal(rCenters.length, 4, '4x4: four center pieces sit on the R face');
    const movedAny = rCenters.some(cubie => {
      const after = cubieById(rMove, cubie.id)!;
      return after.position.join(',') !== cubie.position.join(',');
    });
    assert.ok(movedAny, '4x4: R-face centers are genuinely displaced by an R turn, not fixed');
  } else {
    // 2x2/3x3 have no centers to move at all (2x2) or fixed reference centers (3x3, asserted above).
    assert.equal(solvedAtSize.cubies.filter(cubie => cubie.type === 'center').length, expected.centers, `${size}x${size}: center count matches fixed/none expectation`);
  }

  // Randomization truth: only ever reached through legal moves, and always reversible, for
  // several independent trials per size (randomScramble uses Math.random, not a fixed seed).
  for (let trial = 0; trial < 8; trial++) {
    const scramble = randomScramble(size);
    assert.ok(scramble.every((move, index) => index === 0 || move[0] !== scramble[index - 1][0]), `${size}x${size} trial ${trial}: scramble avoids repeated-face runs`);
    const scrambled = applySequence(solvedAtSize, scramble);
    assert.equal(stickerNodes(scrambled).length, counts.stickers, `${size}x${size} trial ${trial}: sticker count unchanged after scrambling`);
    assert.equal(new Set(scrambled.cubies.map(cubie => cubie.id)).size, solvedAtSize.cubies.length, `${size}x${size} trial ${trial}: no piece lost after scrambling`);
    // Live solve: randomize -> non-solved (almost always) -> inverse solve -> solved.
    const solvedAgain = applySequence(scrambled, invertSequence(scramble));
    assert.ok(isSolved(solvedAgain), `${size}x${size} trial ${trial}: scramble + inverse solve returns to solved`);
    assert.equal(cubeSignature(solvedAgain), cubeSignature(solvedAtSize), `${size}x${size} trial ${trial}: fully restores position and orientation`);
    // Step-by-step "Previous" consistency through the solve direction, same invariant the
    // flagship sequence is checked against above.
    const solveSequence = invertSequence(scramble);
    for (let step = 1; step <= solveSequence.length; step++) {
      const stateAtStep = applySequence(scrambled, solveSequence.slice(0, step));
      const back = applySequence(stateAtStep, invertSequence([solveSequence[step - 1]]));
      assert.equal(cubeSignature(back), cubeSignature(applySequence(scrambled, solveSequence.slice(0, step - 1))), `${size}x${size} trial ${trial}: solve step ${step} back returns the exact preceding state`);
    }
  }

  // Motion graph token / sticker-mapping tests: every size gets a distinct, finite slot per
  // movable piece, and the advanced-view formula (6*N^2) matches what stickerNodes() produces.
  const tokens = pieceMapTokens(solvedAtSize);
  assert.equal(tokens.length, counts.movable, `${size}x${size}: motion graph shows exactly ${counts.movable} tokens`);
  assert.equal(new Set(tokens.map(token => token.slot.join(','))).size, tokens.length, `${size}x${size}: every token has a distinct motion-graph slot`);
  for (const token of tokens) assert.ok(Number.isFinite(token.slot[0]) && Number.isFinite(token.slot[1]), `${size}x${size}: token ${token.id} has finite slot coordinates`);
  assert.equal(nodesAtSize.length, 6 * size * size, `${size}x${size}: advanced sticker view formula matches stickerNodes() output`);

  // Every viewpoint's projected geometry stays finite at this size too (not just 3x3).
  for (const view of viewpoints) {
    const surfaces = cubeSurfaces(solvedAtSize, view);
    assert.ok(surfaces.every(surface => !/NaN|Infinity/.test(surface.points)), `${size}x${size} ${view}: finite projected geometry`);
  }
}

console.log('Rubik engine, live solve, hidden-piece reveal, synchronized motion, six-color visibility and 2x2/3x3/4x4 structure/randomization/sticker-mapping invariants passed.');
