import type { Cell } from './types';

export const createDungeonGrid = (size: number = 8, totalTraps: number = 10): Cell[][] => {
  let idCounter = 0;
  const grid: Cell[][] = [];

  for (let r = 0; r < size; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < size; c++) {
      row.push({
        id: idCounter++,
        row: r,
        col: c,
        isTrap: false,
        isRevealed: false,
        isPotionMarked: false,
        neighborTraps: 0,
      });
    }
    grid.push(row);
  }

  let placedTraps = 0;
  while (placedTraps < totalTraps) {
    const randomRow = Math.floor(Math.random() * size);
    const randomCol = Math.floor(Math.random() * size);
    const cell = grid[randomRow]?.[randomCol];
    if (cell && !cell.isTrap) {
      cell.isTrap = true;
      placedTraps++;
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const currentCell = grid[r]?.[c];
      if (!currentCell || currentCell.isTrap) continue;

      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (grid[nr]?.[nc]?.isTrap) {
              count++;
            }
          }
        }
      }
      currentCell.neighborTraps = count;
    }
  }

  return grid;
};

export const revealEmptyCells = (
  grid: Cell[][],
  startRow: number,
  startCol: number,
  size: number,
) => {
  const queue: [number, number][] = [[startRow, startCol]];
  const visited = new Set<string>();
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const coords = queue.shift();
    if (!coords) continue;
    const [r, c] = coords;
    const cell = grid[r]?.[c];
    if (!cell) continue;

    if (!cell.isRevealed && !cell.isPotionMarked) {
      cell.isRevealed = true;
    }

    if (cell.neighborTraps > 0) continue;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;

        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(key)) {
          visited.add(key);
          const neighbor = grid[nr]?.[nc];
          if (neighbor && !neighbor.isTrap && !neighbor.isRevealed) {
            if (neighbor.neighborTraps === 0) {
              queue.push([nr, nc]);
            } else {
              neighbor.isRevealed = true;
            }
          }
        }
      }
    }
  }
};
