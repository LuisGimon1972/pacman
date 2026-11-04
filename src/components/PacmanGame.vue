<template>
  <q-page class="flex flex-center bg-grey-10 text-white q-pa-md">
    <div class="column items-center">
      <div class="row q-mb-md q-gutter-xl text-h6 font-mono text-weight-bold">
        <div>
          SCORE: <span class="text-amber">{{ score }}</span>
        </div>
        <div>
          LIVES: <span class="text-red">{{ lives }}</span>
        </div>
        <div>
          LEVEL: <span class="text-green">{{ level }}</span>
        </div>
        <div>
          STATE: <span class="text-blue">{{ gameState }}</span>
        </div>
      </div>

      <div class="canvas-container relative-position">
        <canvas
          ref="gameCanvas"
          width="480"
          height="480"
          class="game-canvas shadow-15 rounded-borders"
        ></canvas>

        <div
          v-if="gameState !== 'PLAYING'"
          class="absolute-full flex flex-center overlay-bg column q-gutter-md"
        >
          <div class="text-h4 text-weight-bold text-amber">
            {{ gameState === 'MENU' ? 'MEGA PACMAN' : 'GAME OVER' }}
          </div>
          <div v-if="gameState === 'GAMEOVER'" class="text-subtitle1 text-grey-4">
            Pontuação Final: {{ score }}
          </div>
          <q-btn
            color="amber"
            text-color="dark"
            size="lg"
            icon="play_arrow"
            :label="gameState === 'MENU' ? 'Iniciar Jogo' : 'Tentar Novamente'"
            @click="initGame"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { MAZE_GRID, TILE_SIZE } from '../game/maze';
import { checkWallCollision } from '../game/collision';
import { SpriteAtlas } from '../game/spriteAtlas';
import type { GameState, Direction } from '../game/types';

import atlasImage from '../assets/pacman_atlas.jpg';

const gameCanvas = ref<HTMLCanvasElement | null>(null);
const score = ref<number>(0);
const lives = ref<number>(3);
const level = ref<number>(1);
const gameState = ref<GameState>('MENU');

let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number;
let currentMap: number[][] = [];

const atlas = new SpriteAtlas(atlasImage);

const player = ref({
  x: 48,
  y: 48,
  size: 16,
  speed: 2,
  dx: 0,
  dy: 0,
  direction: 'RIGHT' as Direction,
});

const enemies = ref([
  { x: 432, y: 432, size: 16, speed: 2, dx: 0, dy: -2, row: 3 },
  { x: 48, y: 432, size: 16, speed: 2, dx: -2, dy: 0, row: 6 },
]);

const appleItem = ref<{ col: number; row: number; active: boolean }>({
  col: 3,
  row: 3,
  active: false,
});

onMounted(() => {
  if (gameCanvas.value) {
    ctx = gameCanvas.value.getContext('2d');
    if (ctx) ctx.imageSmoothingEnabled = false;
    resetMap();
    drawScene();
  }
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  cancelAnimationFrame(animationFrameId);
});

const resetMap = () => {
  currentMap = MAZE_GRID.map((row) => [...row]);
  appleItem.value.active = true;
};

const countRemainingDots = (): number => {
  let count = 0;
  for (let r = 0; r < currentMap.length; r++) {
    const currentRow = currentMap[r];
    if (!currentRow) continue;

    for (let c = 0; c < currentRow.length; c++) {
      if (currentRow[c] === 2) count++;
    }
  }
  return count;
};

const drawScene = () => {
  if (!ctx || !gameCanvas.value) return;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);

  for (let row = 0; row < currentMap.length; row++) {
    const currentRow = currentMap[row];
    if (!currentRow) continue;

    for (let col = 0; col < currentRow.length; col++) {
      const tile = currentRow[col];
      const posX = col * TILE_SIZE + TILE_SIZE / 2;
      const posY = row * TILE_SIZE + TILE_SIZE / 2;

      if (tile === 1) {
        atlas.draw(ctx, 2, 13, posX, posY, TILE_SIZE, 60, 66);
      } else if (tile === 2) {
        if (!(
          appleItem.value.active &&
          appleItem.value.col === col &&
          appleItem.value.row === row
        )) {
          atlas.draw(ctx, 4, 9, posX, posY, TILE_SIZE * 0.4, 63, 66);
        }
      }
    }
  }

  if (appleItem.value.active) {
    const appleX = appleItem.value.col * TILE_SIZE + TILE_SIZE / 2;
    const appleY = appleItem.value.row * TILE_SIZE + TILE_SIZE / 2;

    atlas.draw(ctx, 0, 15, appleX, appleY, TILE_SIZE * 0.8, 63, 66);
  }
};

const initGame = () => {
  score.value = 0;
  lives.value = 3;
  level.value = 1;
  player.value.x = 48;
  player.value.y = 48;
  player.value.dx = 0;
  player.value.dy = 0;
  player.value.direction = 'RIGHT';

  enemies.value = [
    { x: 432, y: 432, size: 16, speed: 2, dx: 0, dy: -2, row: 3 },
    { x: 48, y: 432, size: 16, speed: 2, dx: -2, dy: 0, row: 6 },
  ];

  resetMap();
  gameState.value = 'PLAYING';

  cancelAnimationFrame(animationFrameId);
  gameLoop();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (gameState.value !== 'PLAYING') return;

  let nextDx = 0;
  let nextDy = 0;

  switch (e.key) {
    case 'ArrowUp':
    case 'w':
      nextDy = -player.value.speed;
      player.value.direction = 'UP';
      break;
    case 'ArrowDown':
    case 's':
      nextDy = player.value.speed;
      player.value.direction = 'DOWN';
      break;
    case 'ArrowLeft':
    case 'a':
      nextDx = -player.value.speed;
      player.value.direction = 'LEFT';
      break;
    case 'ArrowRight':
    case 'd':
      nextDx = player.value.speed;
      player.value.direction = 'RIGHT';
      break;
  }

  player.value.dx = nextDx;
  player.value.dy = nextDy;
};

// Inteligência de Perseguição (Chasing AI)
const updateEnemyAutonomous = (en: any) => {
  const nextX = en.x + en.dx;
  const nextY = en.y + en.dy;

  if (checkWallCollision(nextX, nextY, en.size - 7)) {
    const possibleMoves = [
      { dx: 0, dy: -en.speed },
      { dx: 0, dy: en.speed },
      { dx: -en.speed, dy: 0 },
      { dx: en.speed, dy: 0 },
    ];

    const validMoves = possibleMoves.filter(
      (m) => !checkWallCollision(en.x + m.dx, en.y + m.dy, en.size - 7),
    );

    if (validMoves.length > 0) {
      let bestMove = validMoves[0];
      let minDistance = Infinity;

      for (const move of validMoves) {
        const simulatedX = en.x + move.dx;
        const simulatedY = en.y + move.dy;
        const distance = Math.hypot(player.value.x - simulatedX, player.value.y - simulatedY);

        if (distance < minDistance) {
          minDistance = distance;
          bestMove = move;
        }
      }

      if (bestMove) {
        en.dx = bestMove.dx;
        en.dy = bestMove.dy;
      }
    } else {
      en.dx = -en.dx;
      en.dy = -en.dy;
    }
  } else {
    en.x = nextX;
    en.y = nextY;
  }
};

const gameLoop = () => {
  if (gameState.value !== 'PLAYING' || !ctx || !gameCanvas.value) {
    return;
  }

  const nextX = player.value.x + player.value.dx;
  const nextY = player.value.y + player.value.dy;

  if (!checkWallCollision(nextX, nextY, player.value.size - 7)) {
    player.value.x = nextX;
    player.value.y = nextY;
  } else {
    player.value.dx = 0;
    player.value.dy = 0;
  }

  const currentTileCol = Math.floor(player.value.x / TILE_SIZE);
  const currentTileRow = Math.floor(player.value.y / TILE_SIZE);

  if (
    currentTileRow >= 0 &&
    currentTileRow < currentMap.length &&
    currentTileCol >= 0 &&
    currentTileCol < (currentMap[0]?.length ?? 0)
  ) {
    const currentRow = currentMap[currentTileRow];
    if (currentRow && currentRow[currentTileCol] === 2) {
      currentRow[currentTileCol] = 0;
      score.value += 10;

      if (countRemainingDots() === 0) {
        level.value += 1;
        resetMap();

        const ghostSpeed = Math.min(2 + Math.floor(level.value / 2), 4);
        enemies.value.push(
          {
            x: 3 * TILE_SIZE,
            y: 3 * TILE_SIZE,
            size: 16,
            speed: ghostSpeed,
            dx: 0,
            dy: ghostSpeed,
            row: 3,
          },
          {
            x: 3 * TILE_SIZE,
            y: 3 * TILE_SIZE,
            size: 16,
            speed: ghostSpeed,
            dx: -ghostSpeed,
            dy: 0,
            row: 6,
          },
        );
      }
    }
  }

  // Verifica se o jogador apanhou a maçã com base na grelha exata
  if (appleItem.value.active) {
    const appleX = appleItem.value.col * TILE_SIZE + TILE_SIZE / 2;
    const appleY = appleItem.value.row * TILE_SIZE + TILE_SIZE / 2;
    const distanceToApple = Math.hypot(player.value.x - appleX, player.value.y - appleY);

    if (distanceToApple < 10) {
      lives.value += 1; // Recupera vida
      appleItem.value.active = false;
      score.value += 50;
    }
  }

  drawScene();

  for (const en of enemies.value) {
    updateEnemyAutonomous(en);

    atlas.draw(ctx, 0, en.row, en.x, en.y, TILE_SIZE, 60, 66);

    const distanceToEnemy = Math.hypot(player.value.x - en.x, player.value.y - en.y);

    if (distanceToEnemy < player.value.size + en.size - 8) {
      lives.value -= 1;
      if (lives.value <= 0) {
        gameState.value = 'GAMEOVER';
      } else {
        player.value.x = 48;
        player.value.y = 48;
        player.value.dx = 0;
        player.value.dy = 0;
      }
      break;
    }
  }

  let playerCol = 1;
  if (player.value.direction === 'UP') playerCol = 1;
  else if (player.value.direction === 'LEFT') playerCol = 2;
  else if (player.value.direction === 'RIGHT') playerCol = 3;

  atlas.draw(ctx, playerCol, 0, player.value.x, player.value.y, TILE_SIZE, 63, 66);

  animationFrameId = requestAnimationFrame(gameLoop);
};
</script>

<style scoped>
.game-canvas {
  background-color: black;
  border: 2px solid #1f2937;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.canvas-container {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
}
.overlay-bg {
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
}
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
