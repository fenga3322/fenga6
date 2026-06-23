const CELL_STATES = Object.freeze({ unknown: 'unknown', frog: 'frog', excluded: 'excluded' });
const palette = ['pond', 'lotus', 'sun', 'sky', 'berry', 'mint', 'peach', 'lavender', 'reed'];
const ageBySize = { 6: '6–7 岁', 7: '7–8 岁', 9: '8–9 岁' };

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function randomSolutionColumns(size) {
  const columns = Array.from({ length: size }, (_, index) => index);
  for (let attempt = 0; attempt < 5000; attempt += 1) {
    const candidate = shuffle(columns);
    if (candidate.every((col, row) => row === 0 || Math.abs(col - candidate[row - 1]) > 1)) return candidate;
  }
  return columns.map((_, row) => (row * 2) % size);
}

function neighbors4(row, col, size) {
  return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);
}

function buildConnectedRegions(size, solutionColumns) {
  const regionIds = Array.from({ length: size }, () => Array.from({ length: size }, () => -1));
  const frontier = [];
  solutionColumns.forEach((col, row) => {
    regionIds[row][col] = row;
    frontier.push([row, col]);
  });

  let remaining = size * size - size;
  while (remaining > 0) {
    const [row, col] = frontier[Math.floor(Math.random() * frontier.length)];
    const openNeighbors = neighbors4(row, col, size).filter(([r, c]) => regionIds[r][c] === -1);
    if (openNeighbors.length === 0) continue;
    const [nextRow, nextCol] = openNeighbors[Math.floor(Math.random() * openNeighbors.length)];
    regionIds[nextRow][nextCol] = regionIds[row][col];
    frontier.push([nextRow, nextCol]);
    remaining -= 1;
  }
  return regionIds;
}

function generatePuzzle(size) {
  const solutionColumns = randomSolutionColumns(size);
  const regionIds = buildConnectedRegions(size, solutionColumns);
  const colors = shuffle(palette).slice(0, size);
  return {
    id: `RANDOM-${Date.now()}`,
    age: ageBySize[size],
    size,
    title: '随机池塘探案',
    colors,
    premise: `本题随机生成 ${size} 只青蛙、${size} 个连通颜色区域；每行、每列、每个区域恰好 1 只青蛙。`,
    grid: regionIds.map((row) => row.map((regionId) => ({ color: colors[regionId], regionId }))),
    solution: solutionColumns.map((solutionCol) => Array.from({ length: size }, (_, col) => col === solutionCol ? 1 : 0))
  };
}

function createEmptyMarks(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => CELL_STATES.unknown));
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
  return puzzle.colors.map((color, regionId) => ({
    color,
    regionId,
    cells: puzzle.grid.flatMap((row, rowIndex) => row.flatMap((cell, colIndex) => cell.regionId === regionId ? [[rowIndex, colIndex]] : []))
  }));
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
    frogs.slice(index + 1).forEach(([otherRow, otherCol]) => {
      if (row === otherRow) errors.push(`第 ${row + 1} 行已经有青蛙。`);
      if (col === otherCol) errors.push(`第 ${col + 1} 列已经有青蛙。`);
      if (Math.abs(row - otherRow) <= 1 && Math.abs(col - otherCol) <= 1) errors.push('两只青蛙不能相邻。');
    });
  });
  regions.forEach((region) => {
    const frogsInRegion = region.cells.filter(([row, col]) => marks[row][col] === CELL_STATES.frog).length;
    if (frogsInRegion > 1) errors.push(`${region.color} 区域已经有青蛙。`);
  });
  return [...new Set(errors)];
}

function scoreMarks(puzzle, marks) {
  let found = 0;
  let wrongFrogs = 0;
  let missedFrogs = 0;
  for (let row = 0; row < puzzle.size; row += 1) {
    for (let col = 0; col < puzzle.size; col += 1) {
      if (marks[row][col] === CELL_STATES.frog && puzzle.solution[row][col]) found += 1;
      if (marks[row][col] === CELL_STATES.frog && !puzzle.solution[row][col]) wrongFrogs += 1;
      if (marks[row][col] !== CELL_STATES.frog && puzzle.solution[row][col]) missedFrogs += 1;
    }
  }
  return { found, wrongFrogs, missedFrogs, total: puzzle.size, accuracy: Math.round((found / puzzle.size) * 100) };
}

const board = document.querySelector('#board');
const sizeSelect = document.querySelector('#sizeSelect');
const newGameButton = document.querySelector('#newGameButton');
const checkButton = document.querySelector('#checkButton');
const clearButton = document.querySelector('#clearButton');
const status = document.querySelector('#status');
const levelMeta = document.querySelector('#levelMeta');
const reasonBox = document.querySelector('#reasonBox');
let activePuzzle = generatePuzzle(Number(sizeSelect.value));
let marks = createEmptyMarks(activePuzzle.size);
let checked = false;

function renderMeta() {
  levelMeta.innerHTML = `
    <dt>尺寸</dt><dd>${activePuzzle.size}×${activePuzzle.size}（${activePuzzle.age} 可用）</dd>
    <dt>前提</dt><dd>${activePuzzle.premise}</dd>
    <dt>目标</dt><dd>左键标青蛙，右键标空白，最后点击“检查正确率”。</dd>
  `;
}

function setMark(row, col, state) {
  marks[row][col] = marks[row][col] === state ? CELL_STATES.unknown : state;
  checked = false;
}

function renderBoard() {
  board.style.setProperty('--size', activePuzzle.size);
  board.innerHTML = '';
  for (let row = 0; row < activePuzzle.size; row += 1) {
    for (let col = 0; col < activePuzzle.size; col += 1) {
      const cell = document.createElement('button');
      const state = marks[row][col];
      const color = activePuzzle.grid[row][col].color;
      cell.className = `cell color-${color} state-${state}${checked && activePuzzle.solution[row][col] ? ' reveal-solution' : ''}`;
      cell.type = 'button';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.setAttribute('aria-label', `第 ${row + 1} 行第 ${col + 1} 列，${color}，${state}`);
      cell.textContent = state === CELL_STATES.frog ? '🐸' : state === CELL_STATES.excluded ? '✕' : checked && activePuzzle.solution[row][col] ? '✓' : '';
      board.append(cell);
    }
  }
  renderStatus();
}

function renderStatus() {
  if (checked) {
    const score = scoreMarks(activePuzzle, marks);
    status.textContent = `正确率 ${score.accuracy}%：找对 ${score.found}/${score.total} 只，错标 ${score.wrongFrogs} 格，漏找 ${score.missedFrogs} 只。`;
    status.className = score.found === score.total && score.wrongFrogs === 0 ? 'status success' : 'status error';
    return;
  }
  const errors = validateMarks(activePuzzle, marks);
  status.textContent = errors.length > 0 ? `规则提醒：${errors[0]}` : '请先口述理由，再标记。左键=青蛙，右键=空白。';
  status.className = errors.length > 0 ? 'status error' : 'status';
}

function startNewGame() {
  activePuzzle = generatePuzzle(Number(sizeSelect.value));
  marks = createEmptyMarks(activePuzzle.size);
  checked = false;
  reasonBox.value = '';
  renderMeta();
  renderBoard();
}

board.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  setMark(Number(cell.dataset.row), Number(cell.dataset.col), CELL_STATES.frog);
  renderBoard();
});

board.addEventListener('contextmenu', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  event.preventDefault();
  setMark(Number(cell.dataset.row), Number(cell.dataset.col), CELL_STATES.excluded);
  renderBoard();
});

newGameButton.addEventListener('click', startNewGame);
clearButton.addEventListener('click', () => {
  marks = createEmptyMarks(activePuzzle.size);
  checked = false;
  renderBoard();
});
checkButton.addEventListener('click', () => {
  checked = true;
  renderBoard();
});

renderMeta();
renderBoard();
