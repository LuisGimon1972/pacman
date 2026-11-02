import { MAZE_GRID, TILE_SIZE } from './maze';

export interface Enemy {
  x: number;
  y: number;
  size: number;
  speed: number;
  dx: number;
  dy: number;
  color: string;
}

// Direções possíveis no labirinto
const DIRECTIONS = [
  { dx: 0, dy: -2 }, // Cima
  { dx: 0, dy: 2 }, // Baixo
  { dx: -2, dy: 0 }, // Esquerda
  { dx: 2, dy: 0 }, // Direita
];

// Verifica se uma posição futura colide com as paredes
const isCollidingWithWall = (x: number, y: number, size: number): boolean => {
  const points = [
    { x: x - size, y: y - size },
    { x: x + size, y: y - size },
    { x: x - size, y: y + size },
    { x: x + size, y: y + size },
  ];

  for (const p of points) {
    const col = Math.floor(p.x / TILE_SIZE);
    const row = Math.floor(p.y / TILE_SIZE);

    // Verifica se está fora dos limites do labirinto
    if (row < 0 || row >= MAZE_GRID.length || col < 0 || col >= (MAZE_GRID[0]?.length ?? 0)) {
      return true;
    }

    // Verifica se colidiu com uma parede (tile 1)
    const currentRow = MAZE_GRID[row];
    if (currentRow && currentRow[col] === 1) {
      return true;
    }
  }

  return false;
};

// Atualiza o movimento do inimigo de forma inteligente nos cruzamentos
export const updateEnemyPosition = (enemy: Enemy, playerX: number, playerY: number) => {
  const nextX = enemy.x + enemy.dx;
  const nextY = enemy.y + enemy.dy;

  // Verifica se o inimigo está centralizado no tile (com tolerância)
  const isAtTileCenter = Math.abs(enemy.x % TILE_SIZE) < 0.5 && Math.abs(enemy.y % TILE_SIZE) < 0.5;

  if (isCollidingWithWall(nextX, nextY, enemy.size) || isAtTileCenter) {
    let bestDirection = { dx: enemy.dx, dy: enemy.dy };
    let minDistance = Infinity;

    for (const dir of DIRECTIONS) {
      // Impede o inimigo de voltar diretamente pelo caminho oposto imediatamente
      if (dir.dx === -enemy.dx && dir.dy === -enemy.dy && (enemy.dx !== 0 || enemy.dy !== 0)) {
        continue;
      }

      const testX = enemy.x + dir.dx;
      const testY = enemy.y + dir.dy;

      if (!isCollidingWithWall(testX, testY, enemy.size)) {
        // Distância Euclidiana até o jogador
        const dist = Math.hypot(testX - playerX, testY - playerY);
        if (dist < minDistance) {
          minDistance = dist;
          bestDirection = dir;
        }
      }
    }

    // Segurança contra becos sem saída
    if (minDistance === Infinity) {
      bestDirection = { dx: -enemy.dx, dy: -enemy.dy };
    }

    enemy.dx = bestDirection.dx;
    enemy.dy = bestDirection.dy;
  }

  enemy.x += enemy.dx;
  enemy.y += enemy.dy;
};
