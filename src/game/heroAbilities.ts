import type { Cell, Hero } from './types';

export const executeCrossScan = (
  grid: Cell[][],
  centerRow: number,
  centerCol: number,
  size: number,
  hero: Hero,
): boolean => {
  if (hero.specialSkillCooldown > 0) return false;

  for (let i = 0; i < size; i++) {
    const row = grid[centerRow];
    if (row) {
      const rowCell = row[i];
      if (rowCell && !rowCell.isTrap && !rowCell.isPotionMarked) {
        rowCell.isRevealed = true;
      }
    }

    const colRow = grid[i];
    if (colRow) {
      const colCell = colRow[centerCol];
      if (colCell && !colCell.isTrap && !colCell.isPotionMarked) {
        colCell.isRevealed = true;
      }
    }
  }

  hero.specialSkillCooldown = 3;
  return true;
};

export const executeSafeHint = (grid: Cell[][], size: number): Cell | null => {
  const unrevealedSafeCells: Cell[] = [];

  for (let r = 0; r < size; r++) {
    const row = grid[r];
    if (!row) continue;

    for (let c = 0; c < size; c++) {
      const cell = row[c];
      if (cell && !cell.isRevealed && !cell.isTrap && !cell.isPotionMarked) {
        unrevealedSafeCells.push(cell);
      }
    }
  }

  if (unrevealedSafeCells.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * unrevealedSafeCells.length);
  const hintCell = unrevealedSafeCells[randomIndex];
  if (hintCell) {
    hintCell.isSafeHinted = true;
    return hintCell;
  }

  return null;
};
