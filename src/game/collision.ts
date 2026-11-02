import { MAZE_GRID, TILE_SIZE } from './maze';

export const checkWallCollision = (nextX: number, nextY: number, size: number): boolean => {
  // Verifica os 4 cantos do personagem para colisão precisa com o tile
  const points = [
    { x: nextX - size, y: nextY - size }, // Cima-Esquerda
    { x: nextX + size, y: nextY - size }, // Cima-Direita
    { x: nextX - size, y: nextY + size }, // Baixo-Esquerda
    { x: nextX + size, y: nextY + size }, // Baixo-Direita
  ];

  for (const p of points) {
    const col = Math.floor(p.x / TILE_SIZE);
    const row = Math.floor(p.y / TILE_SIZE);

    // Se estiver fora dos limites do mapa
    if (row < 0 || row >= MAZE_GRID.length || col < 0 || col >= (MAZE_GRID[0]?.length ?? 0)) {
      return true;
    }

    // Se encontrar uma parede (1)
    // Se encontrar uma parede (1)
    if (MAZE_GRID[row]?.[col] === 1) {
      return true;
    }
  }

  return false;
};
