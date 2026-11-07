<template>
  <q-page class="flex flex-center bg-grey-10 text-white q-pa-md game-page">
    <div class="column items-center q-pa-xs full-width">
      <div
        class="row q-mb-sm q-gutter-md sm:q-gutter-xl text-subtitle1 sm:text-h6 font-mono text-weight-bold justify-center text-center items-center"
      >
        <div>
          SCORE: <span class="text-amber">{{ score }}</span>
        </div>
        <div>
          LIVES: <span class="text-red">{{ lives }}</span>
        </div>
        <div>
          LEVEL: <span class="text-green">{{ level }}</span>
        </div>
        <div v-if="powerTimer > 0">
          PODER: <span class="text-purple">{{ Math.ceil(powerTimer / 60) }}s</span>
        </div>

        <div class="row q-gutter-xs" v-if="gameState === 'PLAYING' || gameState === 'PAUSED'">
          <q-btn
            color="orange-8"
            text-color="white"
            size="sm"
            dense
            flat
            icon="pause"
            :label="gameState === 'PAUSED' ? 'Continuar' : 'Pausar'"
            @click="togglePause"
          />
          <q-btn
            color="red-8"
            text-color="white"
            size="sm"
            dense
            flat
            icon="refresh"
            label="Reiniciar"
            @click="initGame"
          />
        </div>
      </div>
      <div class="canvas-container relative-position q-my-sm">
        <canvas
          ref="gameCanvas"
          width="480"
          height="480"
          class="game-canvas shadow-15 rounded-borders"
          tabindex="0"
        ></canvas>

        <div
          v-if="gameState !== 'PLAYING'"
          class="absolute-full flex flex-center overlay-bg column q-gutter-md text-center q-pa-md"
          :class="{ 'victory-overlay': gameState === 'VICTORY' }"
        >
          <div
            class="text-h4 text-weight-bold"
            :class="gameState === 'VICTORY' ? 'text-green-4 victory-title' : 'text-amber'"
          >
            {{
              gameState === 'MENU'
                ? 'MEGA PACMAN'
                : gameState === 'PAUSED'
                  ? 'JOGO PAUSADO'
                  : gameState === 'VICTORY'
                    ? '🎉 PARABÉNS! VITÓRIA! 🎉'
                    : 'GAME OVER'
            }}
          </div>
          <div
            v-if="gameState === 'GAMEOVER' || gameState === 'VICTORY'"
            class="text-subtitle1 text-grey-4"
          >
            Pontuação Final: {{ score }}
          </div>
          <div v-if="gameState === 'VICTORY'" class="text-caption text-amber-3">
            Você completou todos os níveis com maestria!
          </div>
          <q-btn
            :color="gameState === 'VICTORY' ? 'green-5' : 'amber'"
            text-color="dark"
            size="lg"
            icon="play_arrow"
            :label="
              gameState === 'MENU'
                ? 'Iniciar Jogo'
                : gameState === 'PAUSED'
                  ? 'Continuar Jogo'
                  : 'Jogar Novamente'
            "
            @click.stop="gameState === 'PAUSED' ? togglePause() : initGame()"
          />
        </div>
      </div>

      <div
        v-if="gameState === 'PLAYING'"
        class="column items-center q-mt-sm q-gutter-xs d-pad-container"
      >
        <q-btn
          color="amber"
          text-color="dark"
          icon="arrow_upward"
          size="lg"
          class="d-pad-btn q-px-xl"
          @touchstart.prevent.stop="setDirection('UP')"
          @click.stop="setDirection('UP')"
        />
        <div class="row q-gutter-sm">
          <q-btn
            style="margin-left: 10px"
            color="amber"
            text-color="dark"
            icon="arrow_back"
            size="lg"
            class="d-pad-btn"
            @touchstart.prevent.stop="setDirection('LEFT')"
            @click.stop="setDirection('LEFT')"
          />
          <q-btn
            style="margin-left: -5px"
            color="amber"
            text-color="dark"
            icon="arrow_downward"
            size="lg"
            class="d-pad-btn"
            @touchstart.prevent.stop="setDirection('DOWN')"
            @click.stop="setDirection('DOWN')"
          />
          <q-btn
            style="margin-left: -5px"
            color="amber"
            text-color="dark"
            icon="arrow_forward"
            size="lg"
            class="d-pad-btn"
            @touchstart.prevent.stop="setDirection('RIGHT')"
            @click.stop="setDirection('RIGHT')"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { MAZE_GRID, TILE_SIZE } from '../game/maze';
import { checkWallCollision } from '../game/collision';
import { SpriteAtlas } from '../game/spriteAtlas';
import type { Direction } from '../game/types';

import atlasImage from '../assets/pacman_atlas.jpg';

type ExtendedGameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

const gameCanvas = ref<HTMLCanvasElement | null>(null);
const score = ref<number>(0);
const lives = ref<number>(3);
const level = ref<number>(1);
const gameState = ref<ExtendedGameState>('MENU');

let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number;
let currentMap: number[][] = [];
let invulnerableTimer: number = 0;
let powerTimer: number = 0;

let victoryConfetti: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vy: number;
  vx: number;
  rot: number;
  vRot: number;
}[] = [];

let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playSound = (type: 'dot' | 'apple' | 'star' | 'death' | 'victory') => {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (type === 'dot') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 0.08);
    } else if (type === 'apple') {
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
    } else if (type === 'star') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(900, now + 0.1);
      osc.frequency.setValueAtTime(1200, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 0.4);
    } else if (type === 'death') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 0.4);
    } else if (type === 'victory') {
      // Fanfarra triunfante de notas
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const noteOsc = audioCtx!.createOscillator();
        const noteGain = audioCtx!.createGain();
        noteOsc.type = 'triangle';
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.15);
        noteGain.gain.setValueAtTime(0.2, now + idx * 0.15);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);
        noteOsc.connect(noteGain);
        noteGain.connect(audioCtx!.destination);
        noteOsc.start(now + idx * 0.15);
        noteOsc.stop(now + idx * 0.15 + 0.4);
      });
    }
  } catch (e) {
    console.error(e);
  }
};

const atlas = new SpriteAtlas(atlasImage);

const player = ref({
  x: 48,
  y: 48,
  size: 16,
  speed: 2,
  dx: 2,
  dy: 0,
  direction: 'RIGHT' as Direction,
  nextDirection: 'RIGHT' as Direction,
});

const enemies = ref<any[]>([]);
const apples = ref<{ col: number; row: number; active: boolean }[]>([]);
const stars = ref<{ col: number; row: number; active: boolean }[]>([]);

onMounted(() => {
  setupCanvasContext();
  resetMap();
  drawScene();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  cancelAnimationFrame(animationFrameId);
});

const setupCanvasContext = () => {
  if (gameCanvas.value && !ctx) {
    ctx = gameCanvas.value.getContext('2d');
    if (ctx) ctx.imageSmoothingEnabled = false;
  }
};

const spawnApplesAndStars = () => {
  apples.value = [];
  stars.value = [];
  const appleCount = level.value + 1;
  const availableDots: { col: number; row: number }[] = [];

  for (let r = 0; r < currentMap.length; r++) {
    const row = currentMap[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 2 && !(c === 1 && r === 1)) {
        availableDots.push({ col: c, row: r });
      }
    }
  }

  for (let i = availableDots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = availableDots[i]!;
    availableDots[i] = availableDots[j]!;
    availableDots[j] = temp;
  }

  for (let i = 0; i < appleCount && availableDots.length > 0; i++) {
    const spot = availableDots.pop();
    if (spot) {
      apples.value.push({ col: spot.col, row: spot.row, active: true });
    }
  }

  const starCount = Math.max(0, level.value - 1);
  for (let i = 0; i < starCount && availableDots.length > 0; i++) {
    const starSpot = availableDots.pop();
    if (starSpot) {
      stars.value.push({ col: starSpot.col, row: starSpot.row, active: true });
    }
  }
};

const spawnEnemiesForLevel = () => {
  const ghostCount = 1 + level.value;
  const newEnemies = [];
  const enemySpeed = level.value >= 5 ? 2 + (level.value - 4) * 0.5 : 2;

  const basePositions = [
    { x: 432, y: 432, dx: 0, dy: -enemySpeed, row: 3 },
    { x: 48, y: 432, dx: -enemySpeed, dy: 0, row: 6 },
    { x: 432, y: 48, dx: -enemySpeed, dy: 0, row: 4 },
    { x: 48, y: 48, dx: enemySpeed, dy: 0, row: 3 },
    { x: 240, y: 432, dx: 0, dy: -enemySpeed, row: 6 },
  ];

  for (let i = 0; i < ghostCount; i++) {
    const pos = basePositions[i % basePositions.length];
    if (pos) {
      newEnemies.push({
        x: pos.x,
        y: pos.y,
        size: 16,
        speed: enemySpeed,
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
  spawnApplesAndStars();
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
  setupCanvasContext();
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
        const hasStarHere = stars.value.some((s) => s.active && s.col === col && s.row === row);
        if (!hasAppleHere && !hasStarHere) {
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

  for (const star of stars.value) {
    if (star.active) {
      const starX = star.col * TILE_SIZE + TILE_SIZE / 2;
      const starY = star.row * TILE_SIZE + TILE_SIZE / 2;
      atlas.draw(ctx, 5, 15, starX, starY, TILE_SIZE * 0.8, 63, 66);
    }
  }

  // Efeito de papéis picados (confetes) caindo pelo céu/tela no fim do jogo
  if (gameState.value === 'VICTORY') {
    if (victoryConfetti.length === 0) {
      for (let i = 0; i < 60; i++) {
        victoryConfetti.push({
          x: Math.random() * gameCanvas.value.width,
          y: Math.random() * gameCanvas.value.height - gameCanvas.value.height,
          w: Math.random() * 8 + 6,
          h: Math.random() * 4 + 3,
          color: ['#4ade80', '#fbbf24', '#f43f5e', '#60a5fa', '#c084fc', '#f472b6'][
            Math.floor(Math.random() * 6)
          ]!,
          vy: Math.random() * 2 + 1.5,
          vx: Math.sin(i) * 1.5,
          rot: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 6,
        });
      }
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);

    for (const p of victoryConfetti) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();

      p.y += p.vy;
      p.x += p.vx + Math.sin(p.y * 0.03) * 0.5;
      p.rot += p.vRot;

      if (p.y > gameCanvas.value.height) {
        p.y = -10;
        p.x = Math.random() * gameCanvas.value.width;
      }
    }
  }
};

const triggerVictory = () => {
  gameState.value = 'VICTORY';
  playSound('victory');
};

const initGame = () => {
  initAudio();
  score.value = 0;
  lives.value = 3;
  level.value = 1;
  invulnerableTimer = 0;
  powerTimer = 0;
  victoryConfetti = [];
  player.value.x = 48;
  player.value.y = 48;
  player.value.dx = player.value.speed;
  player.value.dy = 0;
  player.value.direction = 'RIGHT';
  player.value.nextDirection = 'RIGHT';

  resetMap();
  gameState.value = 'PLAYING';

  cancelAnimationFrame(animationFrameId);

  nextTick(() => {
    setupCanvasContext();
    gameCanvas.value?.focus();
    gameLoop();
  });
};

const togglePause = () => {
  if (gameState.value === 'PLAYING') {
    gameState.value = 'PAUSED';
    cancelAnimationFrame(animationFrameId);
  } else if (gameState.value === 'PAUSED') {
    gameState.value = 'PLAYING';
    animationFrameId = requestAnimationFrame(gameLoop);
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'p' || e.key === 'P') {
    if (gameState.value === 'PLAYING' || gameState.value === 'PAUSED') {
      togglePause();
    }
    return;
  }

  if (gameState.value !== 'PLAYING') return;

  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      e.preventDefault();
      setDirection('UP');
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      e.preventDefault();
      setDirection('DOWN');
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      e.preventDefault();
      setDirection('LEFT');
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      e.preventDefault();
      setDirection('RIGHT');
      break;
  }
};

const setDirection = (dir: Direction) => {
  if (gameState.value !== 'PLAYING') return;
  player.value.nextDirection = dir;

  const vels = getVelocitiesForDir(dir);
  const testX = player.value.x + vels.vx;
  const testY = player.value.y + vels.vy;
  if (!checkWallCollision(testX, testY, player.value.size - 7)) {
    player.value.direction = dir;
    player.value.dx = vels.vx;
    player.value.dy = vels.vy;
  }
};

const getVelocitiesForDir = (dir: Direction) => {
  let vx = 0;
  let vy = 0;
  if (dir === 'UP') vy = -player.value.speed;
  if (dir === 'DOWN') vy = player.value.speed;
  if (dir === 'LEFT') vx = -player.value.speed;
  if (dir === 'RIGHT') vx = player.value.speed;
  return { vx, vy };
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
  if (gameState.value !== 'PLAYING') return;

  setupCanvasContext();
  if (!ctx || !gameCanvas.value) {
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  if (invulnerableTimer > 0) invulnerableTimer--;
  if (powerTimer > 0) powerTimer--;

  if (player.value.nextDirection !== player.value.direction) {
    const nextVels = getVelocitiesForDir(player.value.nextDirection);
    const testX = player.value.x + nextVels.vx;
    const testY = player.value.y + nextVels.vy;
    if (!checkWallCollision(testX, testY, player.value.size - 7)) {
      player.value.direction = player.value.nextDirection;
      player.value.dx = nextVels.vx;
      player.value.dy = nextVels.vy;
    }
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
      playSound('dot');

      if (countRemainingDots() === 0) {
        if (level.value >= 10) {
          triggerVictory();
          return;
        }

        level.value += 1;
        resetMap();

        player.value.x = 48;
        player.value.y = 48;
        player.value.dx = player.value.speed;
        player.value.dy = 0;
        player.value.direction = 'RIGHT';
        player.value.nextDirection = 'RIGHT';
        invulnerableTimer = 60;
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
        playSound('apple');
      }
    }
  }

  for (const star of stars.value) {
    if (star.active) {
      const starX = star.col * TILE_SIZE + TILE_SIZE / 2;
      const starY = star.row * TILE_SIZE + TILE_SIZE / 2;
      const distanceToStar = Math.hypot(player.value.x - starX, player.value.y - starY);

      if (distanceToStar < 12) {
        star.active = false;
        score.value += 200;
        powerTimer = 600;
        playSound('star');
      }
    }
  }

  drawScene();

  for (let i = enemies.value.length - 1; i >= 0; i--) {
    const en = enemies.value[i];
    updateEnemyAutonomous(en);

    if (powerTimer > 0) {
      atlas.draw(ctx, 5, en.row, en.x, en.y, TILE_SIZE, 63, 66);
    } else if (invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
      atlas.draw(ctx, 0, en.row, en.x, en.y, TILE_SIZE, 63, 66);
    }

    const distanceToEnemy = Math.hypot(player.value.x - en.x, player.value.y - en.y);

    if (distanceToEnemy < player.value.size + en.size - 8) {
      if (powerTimer > 0) {
        score.value += 100;
        en.x = 240;
        en.y = 240;
      } else if (invulnerableTimer === 0) {
        lives.value -= 1;
        playSound('death');

        if (lives.value <= 0) {
          gameState.value = 'GAMEOVER';
        } else {
          player.value.x = 48;
          player.value.y = 48;
          player.value.dx = player.value.speed;
          player.value.dy = 0;
          player.value.direction = 'RIGHT';
          player.value.nextDirection = 'RIGHT';
          invulnerableTimer = 90;
        }
        break;
      }
    }
  }

  let playerCol = 1;
  if (player.value.direction === 'UP') playerCol = 1;
  else if (player.value.direction === 'LEFT') playerCol = 2;
  else if (player.value.direction === 'RIGHT') playerCol = 3;

  if (invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
    atlas.draw(ctx, playerCol, 0, player.value.x, player.value.y, TILE_SIZE, 63, 66);
  }

  animationFrameId = requestAnimationFrame(gameLoop);
};
</script>

<style scoped>
.game-page {
  min-height: 100vh;
  overflow-x: hidden;
}

.game-canvas {
  background-color: black;
  border: 2px solid #1f2937;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  outline: none;
  touch-action: none;
  width: 100%;
  max-width: 480px;
  height: auto;
  aspect-ratio: 1 / 1;
}

.canvas-container {
  width: 100%;
  max-width: 480px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.overlay-bg {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
}

.victory-overlay {
  background: radial-gradient(circle, rgba(22, 101, 52, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%);
}

.victory-title {
  animation: victory-glow 1.5s ease-in-out infinite alternate;
}

@keyframes victory-glow {
  from {
    text-shadow:
      0 0 10px #4ade80,
      0 0 20px #22c55e;
    transform: scale(1);
  }
  to {
    text-shadow:
      0 0 20px #86efac,
      0 0 35px #16a34a;
    transform: scale(1.05);
  }
}

.d-pad-container {
  user-select: none;
  -webkit-user-select: none;
}

.d-pad-btn {
  min-width: 64px;
  min-height: 54px;
}

.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
