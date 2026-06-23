import assert from 'node:assert/strict';
import { puzzles } from '../data/puzzles.js';
import {
  CELL_STATES,
  applyFrogExclusions,
  completionStats,
  createEmptyMarks,
  findRegions,
  getAdjacentCells,
  generatePuzzle,
  validateMarks,
  validatePuzzlePremises
} from '../src/logic.js';

function solveWithClassroomRules(puzzle) {
  let marks = puzzle.givens.reduce((currentMarks, [row, col]) => (
    applyFrogExclusions(puzzle, currentMarks, row, col)
  ), createEmptyMarks(puzzle.size, puzzle.givens));
  const regions = findRegions(puzzle);
  let changed = true;

  while (changed) {
    changed = false;
    const groups = [
      ...Array.from({ length: puzzle.size }, (_, row) => Array.from({ length: puzzle.size }, (_, col) => [row, col])),
      ...Array.from({ length: puzzle.size }, (_, col) => Array.from({ length: puzzle.size }, (_, row) => [row, col])),
      ...regions.map((region) => region.cells)
    ];

    groups.forEach((cells) => {
      if (cells.some(([row, col]) => marks[row][col] === CELL_STATES.frog)) return;
      const candidates = cells.filter(([row, col]) => marks[row][col] === CELL_STATES.unknown);
      if (candidates.length === 1) {
        const [row, col] = candidates[0];
        marks[row][col] = CELL_STATES.frog;
        marks = applyFrogExclusions(puzzle, marks, row, col);
        changed = true;
      }
    });
  }
  return marks;
}

puzzles.forEach((puzzle) => {
  assert.deepEqual(validatePuzzlePremises(puzzle), [], `${puzzle.id} satisfies V2.1 premises`);
  assert.equal(puzzle.grid.length, puzzle.size, `${puzzle.id} grid row count`);
  assert.equal(findRegions(puzzle).length, puzzle.size, `${puzzle.id} has N connected regions`);

  const solutionMarks = createEmptyMarks(puzzle.size);
  puzzle.solution.forEach((row, rowIndex) => {
    assert.equal(row.filter(Boolean).length, 1, `${puzzle.id} row ${rowIndex + 1} has one frog`);
    row.forEach((hasFrog, colIndex) => {
      if (hasFrog) solutionMarks[rowIndex][colIndex] = CELL_STATES.frog;
    });
  });

  for (let col = 0; col < puzzle.size; col += 1) {
    assert.equal(puzzle.solution.filter((row) => row[col]).length, 1, `${puzzle.id} col ${col + 1} has one frog`);
  }

  findRegions(puzzle).forEach((region) => {
    const frogsInRegion = region.cells.filter(([row, col]) => puzzle.solution[row][col]).length;
    assert.equal(frogsInRegion, 1, `${puzzle.id} ${region.color} region has one frog`);
  });

  assert.deepEqual(validateMarks(puzzle, solutionMarks), [], `${puzzle.id} satisfies constraints`);
  assert.equal(completionStats(puzzle, solutionMarks).complete, true, `${puzzle.id} can be completed`);
  assert.equal(completionStats(puzzle, solveWithClassroomRules(puzzle)).complete, true, `${puzzle.id} is classroom-rule solvable`);
});

assert.deepEqual(getAdjacentCells(0, 0, 3), [[0, 1], [1, 0], [1, 1]], 'corner adjacency');
assert.equal(getAdjacentCells(1, 1, 3).length, 8, 'center adjacency');

[6, 7, 9].forEach((size) => {
  const puzzle = generatePuzzle(size, 20260623 + size);
  assert.deepEqual(validatePuzzlePremises(puzzle), [], `generated ${size}×${size} puzzle satisfies premises`);
  assert.deepEqual(validateMarks(puzzle, puzzle.solution.map((row) => row.map((hasFrog) => hasFrog ? CELL_STATES.frog : CELL_STATES.unknown))), [], `generated ${size}×${size} solution is valid`);
});
