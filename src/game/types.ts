export type GameState = 'MENU' | 'PLAYING' | 'VICTORY' | 'GAMEOVER';

export interface Cell {
  id: number;
  row: number;
  col: number;
  isTrap: boolean;
  isRevealed: boolean;
  isPotionMarked: boolean;
  neighborTraps: number;
  isSafeHinted?: boolean;
}

export interface Hero {
  hp: number;
  maxHp: number;
  potions: number;
  score: number;
  specialSkillCooldown: number;
}
