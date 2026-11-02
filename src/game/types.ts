export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null;

export interface GameObject {
  x: number;
  y: number;
  size: number;
  speed: number;
  dx: number;
  dy: number;
  direction: Direction;
}

export interface Enemy extends GameObject {
  type: 'hunter' | 'blocker';
  color: string;
}

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
