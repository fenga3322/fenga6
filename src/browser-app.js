const CELL_STATES = Object.freeze({
  unknown: 'unknown',
  frog: 'frog',
  excluded: 'excluded'
});

const palette = ['pond', 'lotus', 'sun', 'sky', 'berry', 'mint', 'peach', 'lavender', 'reed'];

function rowRegionPuzzle({ id, age, size, title, solutionColumns, givenRows }) {
  return {
    id,
    age,
    size,
    title,
    colors: palette.slice(0, size),
    premise: `本题有 ${size} 只青蛙、${size} 个连通区域；每行、每列、每个区域恰好 1 只青蛙。`,
    grid: Array.from({ length: size }, (_, row) => (
      Array.from({ length: size }, () => ({ color: palette[row] }))
    )),
    solution: solutionColumns.map((solutionCol) => (
      Array.from({ length: size }, (_, col) => col === solutionCol ? 1 : 0)
    )),
    givens: givenRows.map((row) => [row, solutionColumns[row]])
  };
}

const puzzles = [
  rowRegionPuzzle({ id: 'L1-001', age: '6–7 岁', size: 6, title: '池塘初探', solutionColumns: [0, 2, 4, 1, 3, 5], givenRows: [0, 1, 2, 3, 4] }),
  rowRegionPuzzle({ id: 'L2-001', age: '7–8 岁', size: 7, title: '荷叶小径', solutionColumns: [1, 3, 5, 0, 2, 4, 6], givenRows: [0, 1, 2, 3, 4, 5] }),
  rowRegionPuzzle({ id: 'L3-001', age: '8–9 岁', size: 9, title: '九宫湿地', solutionColumns: [0, 2, 4, 6, 8, 1, 3, 5, 7], givenRows: [0, 1, 2, 3, 4, 5, 6, 7] })
];

function createEmptyMarks(size, givens = []) {
  const marks = Array.from({ length: size }, () => Array.from({ length: size }, () => CELL_STATES.unknown));
  givens.forEach(([row, col]) => {
    marks[row][col] = CELL_STATES.frog;
  });
  return marks;
}

function cycleState(state) {
  if (state === CELL_STATES.unknown) return CELL_STATES.frog;
  if (state === CELL_STATES.frog) return CELL_STATES.excluded;
  return CELL_STATES.unknown;
}

function getAdjacentCells(row, col, size) {
  const cells = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size) cells.push([nextRow, nextCol]);
    }
  }
  return cells;
}

function findRegions(puzzle) {
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
          if (nextRow >= 0 && nextRow < puzzle.size && nextCol >= 0 && nextCol < puzzle.size && !visited[nextRow][nextCol] && puzzle.grid[nextRow][nextCol].color === color) {
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

function applyFrogExclusions(puzzle, marks, row, col) {
  const nextMarks = marks.map((line) => [...line]);
  const region = findRegions(puzzle).find(({ cells }) => cells.some(([r, c]) => r === row && c === col));
  const affected = [
    ...Array.from({ length: puzzle.size }, (_, index) => [row, index]),
    ...Array.from({ length: puzzle.size }, (_, index) => [index, col]),
    ...getAdjacentCells(row, col, puzzle.size),
    ...(region ? region.cells : [])
  ];
  affected.forEach(([nextRow, nextCol]) => {
    if ((nextRow !== row || nextCol !== col) && nextMarks[nextRow][nextCol] === CELL_STATES.unknown) nextMarks[nextRow][nextCol] = CELL_STATES.excluded;
  });
  return nextMarks;
}

function validateMarks(puzzle, marks) {
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

function completionStats(puzzle, marks) {
  let correctFrogs = 0;
  for (let row = 0; row < puzzle.size; row += 1) {
    for (let col = 0; col < puzzle.size; col += 1) {
      if (puzzle.solution[row][col] && marks[row][col] === CELL_STATES.frog) correctFrogs += 1;
    }
  }
  return { correctFrogs, expected: puzzle.size, complete: correctFrogs === puzzle.size };
}

const board = document.querySelector('#board');
const levelSelect = document.querySelector('#levelSelect');
const resetButton = document.querySelector('#resetButton');
const status = document.querySelector('#status');
const levelMeta = document.querySelector('#levelMeta');
let activePuzzle = puzzles[0];
let marks = createInitialMarks(activePuzzle);

function createInitialMarks(puzzle) {
  return puzzle.givens.reduce((currentMarks, [row, col]) => applyFrogExclusions(puzzle, currentMarks, row, col), createEmptyMarks(puzzle.size, puzzle.givens));
}

function isGivenCell(row, col) {
  return activePuzzle.givens.some(([givenRow, givenCol]) => givenRow === row && givenCol === col);
}

function renderLevelOptions() {
  levelSelect.innerHTML = puzzles.map((puzzle, index) => `<option value="${index}">${puzzle.age} · ${puzzle.size}×${puzzle.size} · ${puzzle.title}</option>`).join('');
}

function renderMeta() {
  levelMeta.innerHTML = `
    <dt>尺寸</dt><dd>${activePuzzle.size}×${activePuzzle.size}</dd>
    <dt>前提</dt><dd>${activePuzzle.premise}</dd>
    <dt>区域</dt><dd>${activePuzzle.colors.length} 个同色连通区域</dd>
  `;
}

function renderBoard() {
  board.style.setProperty('--size', activePuzzle.size);
  board.innerHTML = '';
  for (let row = 0; row < activePuzzle.size; row += 1) {
    for (let col = 0; col < activePuzzle.size; col += 1) {
      const cell = document.createElement('button');
      const state = marks[row][col];
      const color = activePuzzle.grid[row][col].color;
      cell.className = `cell color-${color} state-${state}${isGivenCell(row, col) ? ' is-given' : ''}`;
      cell.type = 'button';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.setAttribute('aria-label', `第 ${row + 1} 行第 ${col + 1} 列，${color}，${state}`);
      cell.textContent = state === CELL_STATES.frog ? '🐸' : state === CELL_STATES.excluded ? '✕' : '';
      cell.disabled = isGivenCell(row, col);
      board.append(cell);
    }
  }
  renderStatus();
}

function renderStatus() {
  const errors = validateMarks(activePuzzle, marks);
  const stats = completionStats(activePuzzle, marks);
  if (errors.length > 0) {
    status.textContent = `需要重新说明：${errors[0]}`;
    status.className = 'status error';
    return;
  }
  status.textContent = stats.complete ? '侦探成功：本关所有青蛙已被逻辑证明！' : `已确认 ${stats.correctFrogs}/${stats.expected} 只青蛙。请继续用“因为……”说明推理。`;
  status.className = stats.complete ? 'status success' : 'status';
}

board.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  marks[row][col] = cycleState(marks[row][col]);
  if (marks[row][col] === CELL_STATES.frog) marks = applyFrogExclusions(activePuzzle, marks, row, col);
  renderBoard();
});

levelSelect.addEventListener('change', () => {
  activePuzzle = puzzles[Number(levelSelect.value)];
  marks = createInitialMarks(activePuzzle);
  renderMeta();
  renderBoard();
});

resetButton.addEventListener('click', () => {
  marks = createInitialMarks(activePuzzle);
  renderBoard();
});

renderLevelOptions();
renderMeta();
renderBoard();
