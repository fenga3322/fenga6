import { puzzles } from '../data/puzzles.js';
import { CELL_STATES, applyFrogExclusions, completionStats, createEmptyMarks, cycleState, validateMarks } from './logic.js';

const board = document.querySelector('#board');
const levelSelect = document.querySelector('#levelSelect');
const resetButton = document.querySelector('#resetButton');
const status = document.querySelector('#status');
const levelMeta = document.querySelector('#levelMeta');

let activePuzzle = puzzles[0];
let marks = createInitialMarks(activePuzzle);
let clickTimer = 0;

function createInitialMarks(puzzle) {
  return puzzle.givens.reduce((currentMarks, [row, col]) => (
    applyFrogExclusions(puzzle, currentMarks, row, col)
  ), createEmptyMarks(puzzle.size, puzzle.givens));
}

function isGivenCell(row, col) {
  return activePuzzle.givens.some(([givenRow, givenCol]) => givenRow === row && givenCol === col);
}

function renderLevelOptions() {
  levelSelect.innerHTML = puzzles.map((puzzle, index) => (
    `<option value="${index}">${puzzle.age} · ${puzzle.size}×${puzzle.size} · ${puzzle.title}</option>`
  )).join('');
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
  board.innerHTML = '<div class="coord-label corner" aria-hidden="true"></div>';
  for (let col = 0; col < activePuzzle.size; col += 1) {
    const label = document.createElement('div');
    label.className = 'coord-label top-label';
    label.textContent = `H${col + 1}`;
    board.append(label);
  }
  for (let row = 0; row < activePuzzle.size; row += 1) {
    const rowLabel = document.createElement('div');
    rowLabel.className = 'coord-label side-label';
    rowLabel.textContent = `Z${row + 1}`;
    board.append(rowLabel);
    for (let col = 0; col < activePuzzle.size; col += 1) {
      const cell = document.createElement('button');
      const state = marks[row][col];
      const color = activePuzzle.grid[row][col].color;
      cell.className = `cell color-${color} state-${state}${isGivenCell(row, col) ? ' is-given' : ''}`;
      cell.type = 'button';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.setAttribute('aria-label', `Z${row + 1} 行 H${col + 1} 列，${color}，${state}`);
      cell.textContent = state === CELL_STATES.frog ? '🐸' : state === CELL_STATES.excluded ? '✕' : '';
      cell.disabled = isGivenCell(row, col);
      board.append(cell);
    }
  }
  renderStatus();
}

function autoExcludeFromFrog(row, col) {
  marks = applyFrogExclusions(activePuzzle, marks, row, col);
}

function renderStatus() {
  const errors = validateMarks(activePuzzle, marks);
  const stats = completionStats(activePuzzle, marks);
  if (errors.length > 0) {
    status.textContent = `需要重新说明：${errors[0]}`;
    status.className = 'status error';
    return;
  }
  status.textContent = stats.complete
    ? '侦探成功：本关所有青蛙已被逻辑证明！'
    : `已确认 ${stats.correctFrogs}/${stats.expected} 只青蛙。请继续用“因为……”说明推理。`;
  status.className = stats.complete ? 'status success' : 'status';
}

board.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell || event.detail > 1) return;
  window.clearTimeout(clickTimer);
  clickTimer = window.setTimeout(() => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    marks[row][col] = cycleState(marks[row][col]);
    if (marks[row][col] === CELL_STATES.frog) autoExcludeFromFrog(row, col);
    renderBoard();
  }, 180);
});

board.addEventListener('dblclick', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  event.preventDefault();
  window.clearTimeout(clickTimer);
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  marks[row][col] = marks[row][col] === CELL_STATES.excluded ? CELL_STATES.unknown : CELL_STATES.excluded;
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
