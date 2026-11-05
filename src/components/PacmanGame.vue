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
let invulnerableTimer: number = 0; // Controlo de imunidade para evitar duplo dano

// Contexto de Áudio da Web Audio API para gerar efeitos sonoros instantâneos
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

// Som ao comer um ponto (Waka / Bip curto clássico)
const playEatDotSound = () => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {
    console.error('Erro ao reproduzir som de ponto:', e);
  }
};

// Som ao apanhar a maçã/bónus (Jingle alegre)
const playEatAppleSound = () => {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(500, now + 0.08);
    osc.frequency.setValueAtTime(750, now + 0.16);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(now + 0.3);
  } catch (e) {
    console.error('Erro ao reproduzir som da maçã:', e);
  }
};

// Som ao morrer / perder vida (Tom descendente grave e dramático)
const playDeathSound = () => {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(now + 0.4);
  } catch (e) {
    console.error('Erro ao reproduzir som de morte:', e);
  }
};

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

// Lista dinâmica de inimigos
const enemies = ref<any[]>([]);

// Lista dinâmica de maçãs ativas no mapa
const apples = ref<{ col: number; row: number; active: boolean }[]>([]);

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

const spawnApples = () => {
  apples.value = [];

  // Regra exata: Nível 1 = 2 maçãs, Nível 2 = 3 maçãs, Nível 3 = 4 maçãs, etc.
  const appleCount = level.value + 1;

  const availableCorridors: { col: number; row: number }[] = [];
  for (let r = 0; r < currentMap.length; r++) {
    const row = currentMap[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      if ((row[c] === 0 || row[c] === 2) && !(c === 1 && r === 1)) {
        availableCorridors.push({ col: c, row: r });
      }
    }
  }

  for (let i = 0; i < appleCount && availableCorridors.length > 0; i++) {
    const index = Math.floor(i * (availableCorridors.length / appleCount));
    const spot = availableCorridors[index] || availableCorridors[0];

    if (spot) {
      apples.value.push({ col: spot.col, row: spot.row, active: true });
      availableCorridors.splice(index, 1);
    }
  }
};

const spawnEnemiesForLevel = () => {
  const ghostCount = 1 + level.value;
  const newEnemies = [];

  const basePositions = [
    { x: 432, y: 432, dx: 0, dy: -2, row: 3 },
    { x: 48, y: 432, dx: -2, dy: 0, row: 6 },
    { x: 432, y: 48, dx: -2, dy: 0, row: 4 },
    { x: 48, y: 48, dx: 2, dy: 0, row: 3 },
    { x: 240, y: 432, dx: 0, dy: -2, row: 6 },
  ];

  for (let i = 0; i < ghostCount; i++) {
    const pos = basePositions[i % basePositions.length];
    if (pos) {
      newEnemies.push({
        x: pos.x,
        y: pos.y,
        size: 16,
        speed: 2,
        dx: pos.dx,
        dy: pos.dy,
        row: pos.row,
      });
    }
  }
  enemies.value = newEnemies;
};

const resetMap = () => {
  currentMap = MAZE_GRID.map((row) => [...row]);
  spawnApples();
  spawnEnemiesForLevel();
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
        atlas.draw(ctx, 2, 13, posX, posY, TILE_SIZE, 63, 66);
      } else if (tile === 2) {
        const hasAppleHere = apples.value.some((a) => a.active && a.col === col && a.row === row);
        if (!hasAppleHere) {
          atlas.draw(ctx, 4, 9, posX, posY, TILE_SIZE * 0.4, 63, 66);
        }
      }
    }
  }

  for (const apple of apples.value) {
    if (apple.active) {
      const appleX = apple.col * TILE_SIZE + TILE_SIZE / 2;
      const appleY = apple.row * TILE_SIZE + TILE_SIZE / 2;
      atlas.draw(ctx, 0, 15, appleX, appleY, TILE_SIZE * 0.8, 63, 66);
    }
  }
};

const initGame = () => {
  initAudio();
  score.value = 0;
  lives.value = 3;
  level.value = 1;
  invulnerableTimer = 0;
  player.value.x = 48;
  player.value.y = 48;
  player.value.dx = 0;
  player.value.dy = 0;
  player.value.direction = 'RIGHT';

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

  // Reduz o tempo de invulnerabilidade a cada frame se estiver ativo
  if (invulnerableTimer > 0) {
    invulnerableTimer--;
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
      playEatDotSound();

      if (countRemainingDots() === 0) {
        level.value += 1;
        resetMap();

        player.value.x = 48;
        player.value.y = 48;
        player.value.dx = 0;
        player.value.dy = 0;
        invulnerableTimer = 60; // 1 segundo de segurança ao mudar de nível
      }
    }
  }

  for (const apple of apples.value) {
    if (apple.active) {
      const appleX = apple.col * TILE_SIZE + TILE_SIZE / 2;
      const appleY = apple.row * TILE_SIZE + TILE_SIZE / 2;
      const distanceToApple = Math.hypot(player.value.x - appleX, player.value.y - appleY);

      if (distanceToApple < 12) {
        lives.value += 1;
        apple.active = false;
        score.value += 50;
        playEatAppleSound();
      }
    }
  }

  drawScene();

  for (const en of enemies.value) {
    updateEnemyAutonomous(en);

    // Efeito visual de piscar caso esteja invulnerável
    if (invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
      atlas.draw(ctx, 0, en.row, en.x, en.y, TILE_SIZE, 63, 66);
    }

    const distanceToEnemy = Math.hypot(player.value.x - en.x, player.value.y - en.y);

    // Só processa dano se NÃO estiver no período de invulnerabilidade
    if (distanceToEnemy < player.value.size + en.size - 8 && invulnerableTimer === 0) {
      lives.value -= 1;
      playDeathSound();

      if (lives.value <= 0) {
        gameState.value = 'GAMEOVER';
      } else {
        // Reseta posição e dá 90 frames (aprox 1.5 segundos) de imunidade absoluta
        player.value.x = 48;
        player.value.y = 48;
        player.value.dx = 0;
        player.value.dy = 0;
        invulnerableTimer = 90;
      }
      break;
    }
  }

  let playerCol = 1;
  if (player.value.direction === 'UP') playerCol = 1;
  else if (player.value.direction === 'LEFT') playerCol = 2;
  else if (player.value.direction === 'RIGHT') playerCol = 3;

  // Pacman também pisca visualmente durante a invulnerabilidade
  if (invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
    atlas.draw(ctx, playerCol, 0, player.value.x, player.value.y, TILE_SIZE, 63, 66);
  }

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
