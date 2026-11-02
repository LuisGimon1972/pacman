<template>
  <q-page class="flex flex-center bg-grey-10 text-white q-pa-md">
    <div class="column items-center">
      <!-- Placar e Status -->
      <div class="row q-mb-md q-gutter-xl text-h6 font-mono text-weight-bold">
        <div>
          SCORE2: <span class="text-amber">{{ score }}</span>
        </div>
        <div>
          LIVES: <span class="text-red">{{ lives }}</span>
        </div>
        <div>
          STATE: <span class="text-blue">{{ gameState }}</span>
        </div>
      </div>

      <!-- Container do Canvas -->
      <div class="canvas-container relative-position">
        <canvas
          ref="gameCanvas"
          width="480"
          height="480"
          class="game-canvas shadow-15 rounded-borders"
        ></canvas>

        <!-- Overlay de Menu / Game Over -->
        <div
          v-if="gameState !== 'PLAYING'"
          class="absolute-full flex flex-center overlay-bg column q-gutter-md"
        >
          <div class="text-h4 text-weight-bold text-amber">
            {{ gameState === 'MENU' ? 'CYBER MAZE' : 'GAME OVER' }}
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
import { updateEnemyPosition, type Enemy } from '../game/enemy';
import { SpriteAtlas } from '../game/spriteAtlas';
import type { GameState, Direction } from '../game/types';

const gameCanvas = ref<HTMLCanvasElement | null>(null);
const score = ref<number>(0);
const lives = ref<number>(3);
const gameState = ref<GameState>('MENU');

let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number;
let currentMap: number[][] = [];

// Instancia o gerenciador do Atlas apontando para o arquivo de imagem na pasta public
const atlas = new SpriteAtlas('/assets/pacman_atlas.png');

const player = ref({
  x: 48,
  y: 48,
  size: 16,
  speed: 2,
  dx: 0,
  dy: 0,
  direction: 'RIGHT' as Direction,
});

const enemy = ref<Enemy & { col: number; row: number }>({
  x: 432,
  y: 432,
  size: 16,
  speed: 2,
  dx: 0,
  dy: -2,
  color: '#ef4444',
  col: 0,
  row: 3, // Linha do Caçador no Atlas
});

onMounted(() => {
  if (gameCanvas.value) {
    ctx = gameCanvas.value.getContext('2d');
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
};

const drawScene = () => {
  if (!ctx || !gameCanvas.value) return;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);

  for (let row = 0; row < currentMap.length; row++) {
    const currentRow = currentMap[row];
    if (!currentRow) continue;

    for (let col = 0; col < currentRow.length; col++) {
      const tile = currentRow[col];

      if (tile === 1) {
        // Renderizando a parede usando o tile do Atlas
        atlas.draw(
          ctx,
          1,
          10,
          TILE_SIZE,
          col * TILE_SIZE + TILE_SIZE / 2,
          row * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE,
        );
      } else if (tile === 2) {
        // Fragmento de Dados
        atlas.draw(
          ctx,
          4,
          9,
          TILE_SIZE,
          col * TILE_SIZE + TILE_SIZE / 2,
          row * TILE_SIZE + TILE_SIZE / 2,
          16,
        );
      }
    }
  }
};

const initGame = () => {
  score.value = 0;
  lives.value = 3;
  player.value.x = 48;
  player.value.y = 48;
  player.value.dx = 0;
  player.value.dy = 0;

  enemy.value.x = 432;
  enemy.value.y = 432;
  enemy.value.dx = 0;
  enemy.value.dy = -2;

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

const gameLoop = () => {
  console.log(
    'GameLoop chamado | Estado:',
    gameState.value,
    '| Ctx existe:',
    !!ctx,
    '| Canvas existe:',
    !!gameCanvas.value,
  );

  if (gameState.value !== 'PLAYING' || !ctx || !gameCanvas.value) {
    console.warn('GameLoop abortou porque uma das condições falhou!');
    return;
  }

  if (gameState.value !== 'PLAYING' || !ctx || !gameCanvas.value) return;

  // 1. Movimentação do Jogador
  const nextX = player.value.x + player.value.dx;
  const nextY = player.value.y + player.value.dy;

  if (!checkWallCollision(nextX, nextY, player.value.size - 4)) {
    player.value.x = nextX;
    player.value.y = nextY;
  } else {
    player.value.dx = 0;
    player.value.dy = 0;
  }

  // 2. Movimentação do Inimigo
  updateEnemyPosition(enemy.value, player.value.x, player.value.y);

  // 3. Colisão com o Inimigo
  const distanceToEnemy = Math.hypot(
    player.value.x - enemy.value.x,
    player.value.y - enemy.value.y,
  );
  if (distanceToEnemy < player.value.size + enemy.value.size - 8) {
    lives.value -= 1;
    if (lives.value <= 0) {
      gameState.value = 'GAMEOVER';
    } else {
      player.value.x = 48;
      player.value.y = 48;
      player.value.dx = 0;
      player.value.dy = 0;
    }
  }

  // 4. Coleta de Pontos
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
    }
  }

  // 5. Renderização geral
  drawScene();

  // Mapeia a coluna do sprite do jogador com base na direção atual
  let playerCol = 0;
  if (player.value.direction === 'UP') {
    playerCol = 1;
  } else if (player.value.direction === 'LEFT') {
    playerCol = 2;
  } else if (player.value.direction === 'RIGHT') {
    playerCol = 3;
  } else {
    playerCol = 0; // DOWN ou padrão
  }

  // Desenha o Jogador usando o Sprite Atlas (Linha 0 do atlas)
  atlas.draw(ctx, playerCol, 0, TILE_SIZE, player.value.x, player.value.y, TILE_SIZE * 1.2);

  // Desenha o Inimigo usando o Sprite Atlas (Linha 3 do atlas - Caçador)
  atlas.draw(ctx, 0, 3, TILE_SIZE, enemy.value.x, enemy.value.y, TILE_SIZE * 1.2);

  animationFrameId = requestAnimationFrame(gameLoop);
};
</script>

<style scoped>
.game-canvas {
  background-color: #090d16;
  border: 2px solid #1e293b;
}
.canvas-container {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}
.overlay-bg {
  background-color: rgba(9, 13, 22, 0.85);
  backdrop-filter: blur(4px);
}
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
