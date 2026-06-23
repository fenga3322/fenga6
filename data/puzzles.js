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

export const puzzles = [
  rowRegionPuzzle({
    id: 'L1-001',
    age: '6–7 岁',
    size: 6,
    title: '池塘初探',
    solutionColumns: [0, 2, 4, 1, 3, 5],
    givenRows: [0, 1, 2, 3, 4]
  }),
  rowRegionPuzzle({
    id: 'L2-001',
    age: '7–8 岁',
    size: 7,
    title: '荷叶小径',
    solutionColumns: [1, 3, 5, 0, 2, 4, 6],
    givenRows: [0, 1, 2, 3, 4, 5]
  }),
  rowRegionPuzzle({
    id: 'L3-001',
    age: '8–9 岁',
    size: 9,
    title: '九宫湿地',
    solutionColumns: [0, 2, 4, 6, 8, 1, 3, 5, 7],
    givenRows: [0, 1, 2, 3, 4, 5, 6, 7]
  })
];
