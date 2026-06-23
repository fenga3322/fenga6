export const CELL_STATES = Object.freeze({
  unknown: 'unknown',
  frog: 'frog',
  excluded: 'excluded'
});

export function createEmptyMarks(size, givens = []) {
  const marks = Array.from({ length: size }, () => Array.from({ length: size }, () => CELL_STATES.unknown));
  givens.forEach(([row, col]) => {
    marks[row][col] = CELL_STATES.frog;
  });
  return marks;
}

export function cycleState(state) {
  if (state === CELL_STATES.unknown) return CELL_STATES.frog;
  if (state === CELL_STATES.frog) return CELL_STATES.excluded;
  return CELL_STATES.unknown;
}

export function getAdjacentCells(row, col, size) {
  const cells = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size) {
        cells.push([nextRow, nextCol]);
      }
    }
  }
  return cells;
}

export function findRegions(puzzle) {
  const visited = Array.from({ length: puzzle.size }, () => Array.from({ length: puzzle.size }, () => false));
  const regions = [];

  for (let row = 0; row < puzzle.size; row += 1) {
    for (let col = 0; col < puzzle.size; col += 1) {
      if (visited[row][col]) continue;
      const color = puzzle.grid[row][col].color;
      const cells = [];
      const queue = [[row, col]];
      visited[row][col] = true;

      for (let index = 0; index < queue.length; index += 1) {
        const [currentRow, currentCol] = queue[index];
        cells.push([currentRow, currentCol]);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
          const nextRow = currentRow + dr;
          const nextCol = currentCol + dc;
          if (
            nextRow >= 0 && nextRow < puzzle.size &&
            nextCol >= 0 && nextCol < puzzle.size &&
            !visited[nextRow][nextCol] &&
            puzzle.grid[nextRow][nextCol].color === color
          ) {
            visited[nextRow][nextCol] = true;
            queue.push([nextRow, nextCol]);
          }
        });
      }
      regions.push({ color, cells });
    }
  }

  return regions;
}

export function validatePuzzlePremises(puzzle) {
  const errors = [];
  const colors = new Set(puzzle.grid.flat().map((cell) => cell.color));
  const regions = findRegions(puzzle);
  const frogCount = puzzle.solution.flat().filter(Boolean).length;

  if (frogCount !== puzzle.size) errors.push('青蛙总数必须等于棋盘尺寸。');
  if (colors.size !== puzzle.size) errors.push('颜色种数必须等于棋盘尺寸。');
  if (regions.length !== puzzle.size) errors.push('连通区域总数必须等于棋盘尺寸。');
  colors.forEach((color) => {
    if (regions.filter((region) => region.color === color).length !== 1) {
      errors.push(`${color} 必须只形成一个上下左右连通区域。`);
    }
  });
  return errors;
}

export function applyFrogExclusions(puzzle, marks, row, col) {
  const nextMarks = marks.map((line) => [...line]);
  const region = findRegions(puzzle).find(({ cells }) => cells.some(([r, c]) => r === row && c === col));
  const affected = [
    ...Array.from({ length: puzzle.size }, (_, index) => [row, index]),
    ...Array.from({ length: puzzle.size }, (_, index) => [index, col]),
    ...getAdjacentCells(row, col, puzzle.size),
    ...(region ? region.cells : [])
  ];

  affected.forEach(([nextRow, nextCol]) => {
    if ((nextRow !== row || nextCol !== col) && nextMarks[nextRow][nextCol] === CELL_STATES.unknown) {
      nextMarks[nextRow][nextCol] = CELL_STATES.excluded;
    }
  });
  return nextMarks;
}

export function validateMarks(puzzle, marks) {
  const errors = [];
  const frogs = [];

  for (let row = 0; row < puzzle.size; row += 1) {
    for (let col = 0; col < puzzle.size; col += 1) {
      if (marks[row][col] === CELL_STATES.frog) frogs.push([row, col]);
    }
  }

  const regions = findRegions(puzzle);
  frogs.forEach(([row, col], index) => {
    if (!puzzle.solution[row][col]) errors.push(`第 ${row + 1} 行第 ${col + 1} 列不是青蛙位置。`);
    frogs.slice(index + 1).forEach(([otherRow, otherCol]) => {
      if (row === otherRow) errors.push(`第 ${row + 1} 行出现了多只青蛙。`);
      if (col === otherCol) errors.push(`第 ${col + 1} 列出现了多只青蛙。`);
      if (Math.abs(row - otherRow) <= 1 && Math.abs(col - otherCol) <= 1) errors.push('两只青蛙违反了非相邻规则。');
    });
  });

  regions.forEach((region) => {
    const frogsInRegion = region.cells.filter(([row, col]) => marks[row][col] === CELL_STATES.frog).length;
    if (frogsInRegion > 1) errors.push(`${region.color} 区域出现了多只青蛙。`);
  });

  return [...new Set(errors)];
}

export function completionStats(puzzle, marks) {
  let correctFrogs = 0;
  for (let row = 0; row < puzzle.size; row += 1) {
    for (let col = 0; col < puzzle.size; col += 1) {
      if (puzzle.solution[row][col] && marks[row][col] === CELL_STATES.frog) correctFrogs += 1;
    }
  }
  return { correctFrogs, expected: puzzle.size, complete: correctFrogs === puzzle.size };
}

const generatedPalette = ['pond', 'lotus', 'sun', 'sky', 'berry', 'mint', 'peach', 'lavender', 'reed'];

function randomize(items, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createSeededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function neighborCells4(row, col, size) {
  return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].filter(([r, c]) => (
    r >= 0 && r < size && c >= 0 && c < size
  ));
}

export function generatePuzzle(size, seed = Date.now()) {
  const random = createSeededRandom(seed);
  const baseColumns = Array.from({ length: size }, (_, index) => index);
  let solutionColumns = baseColumns;

  for (let attempt = 0; attempt < 5000; attempt += 1) {
    const candidate = randomize(baseColumns, random);
    if (candidate.every((col, row) => row === 0 || Math.abs(col - candidate[row - 1]) > 1)) {
      solutionColumns = candidate;
      break;
    }
  }

  const regionIds = Array.from({ length: size }, () => Array.from({ length: size }, () => -1));
  const frontier = [];
  solutionColumns.forEach((col, row) => {
    regionIds[row][col] = row;
    frontier.push([row, col]);
  });

  let remaining = size * size - size;
  while (remaining > 0) {
    const [row, col] = frontier[Math.floor(random() * frontier.length)];
    const openNeighbors = neighborCells4(row, col, size).filter(([r, c]) => regionIds[r][c] === -1);
    if (openNeighbors.length === 0) continue;
    const [nextRow, nextCol] = openNeighbors[Math.floor(random() * openNeighbors.length)];
    regionIds[nextRow][nextCol] = regionIds[row][col];
    frontier.push([nextRow, nextCol]);
    remaining -= 1;
  }

  const colors = randomize(generatedPalette, random).slice(0, size);
  return {
    id: `RANDOM-${seed}`,
    size,
    colors,
    grid: regionIds.map((row) => row.map((regionId) => ({ color: colors[regionId], regionId }))),
    solution: solutionColumns.map((solutionCol) => Array.from({ length: size }, (_, col) => col === solutionCol ? 1 : 0))
  };
}
