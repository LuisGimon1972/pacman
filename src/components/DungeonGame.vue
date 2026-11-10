<template>
  <q-page
    class="flex flex-center bg-grey-10 text-white q-pa-sm sm:q-pa-md window-height window-width"
  >
    <div
      style="margin-top: -20px"
      class="column items-center justify-center q-gutter-md dungeon-main-wrapper"
    >
      <div
        style="margin-bottom: -10px"
        class="text-h5 text-weight-bold text-white tracking-wide text-shadow game-title text-center"
      >
        Dungeon Cralwer Game
      </div>
      <q-card flat bordered class="bg-dark q-pa-sm sm:q-pa-md rounded-borders full-width shadow-2">
        <div
          class="row justify-between items-center text-weight-bold text-caption sm:text-subtitle1"
        >
          <div>
            ❤️ HP: <span class="text-red">{{ hero.hp }}/{{ hero.maxHp }}</span>
          </div>
          <div>
            🧪 Poções: <span class="text-amber">{{ remainingPotions }}</span>
          </div>
          <div>
            💰 Ouro: <span class="text-green">{{ hero.score }}</span>
          </div>
        </div>
      </q-card>

      <!-- Grade da Masmorra Centrada -->
      <div class="dungeon-container relative-position shadow-4">
        <div
          class="dungeon-grid"
          :style="{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, var(--tile-size, 42px))`,
            gridTemplateRows: `repeat(${gridSize}, var(--tile-size, 42px))`,
            gap: '4px',
          }"
        >
          <div
            v-for="cell in grid"
            :key="cell.id"
            class="dungeon-tile flex flex-center text-weight-bold cursor-pointer"
            :class="{
              revealed: cell.isRevealed,
              marked: cell.isPotionMarked,
              'trap-triggered': cell.isRevealed && cell.isTrap,
            }"
            @click.exact="revealCell(cell)"
            @click.shift.exact="togglePotion(cell)"
            @contextmenu.prevent="togglePotion(cell)"
          >
            <template v-if="cell.isRevealed">
              <span v-if="cell.isTrap">💣</span>
              <span
                v-else-if="cell.neighborTraps > 0"
                :style="{ color: getNumberColor(cell.neighborTraps) }"
              >
                {{ cell.neighborTraps }}
              </span>
              <span v-else class="text-grey-5">·</span>
            </template>
            <template v-else>
              <span v-if="cell.isPotionMarked" class="text-amber">🧪</span>
              <span v-else class="text-grey-3">?</span>
            </template>
          </div>
        </div>

        <!-- Overlay de Fim de Jogo ou Vitória -->
        <div
          v-if="gameState !== 'PLAYING'"
          class="absolute-full flex flex-center overlay-bg column q-gutter-md rounded-borders q-pa-md"
        >
          <div
            class="text-h5 sm:text-h4 text-weight-bold text-center"
            :class="gameState === 'VICTORY' ? 'text-green victory-glow' : 'text-red'"
          >
            {{ gameState === 'VICTORY' ? '🌟 VITÓRIA NA MASMORRA! 🌟' : 'GAME OVER' }}
          </div>
          <div class="text-subtitle2 sm:text-subtitle1 text-grey-4">
            Pontuação Final: {{ hero.score }} de Ouro
          </div>
          <q-btn
            class="action-btn"
            color="amber"
            text-color="dark"
            size="md"
            icon="replay"
            label="Jogar Novamente"
            @click="initDungeon"
          />
        </div>
      </div>

      <!-- Controles Centrados -->
      <div class="row q-gutter-sm justify-center wrap">
        <q-btn
          style="margin-left: -8px"
          class="action-btn"
          color="amber"
          text-color="dark"
          icon="replay"
          label="Reiniciar"
          @click="initDungeon"
        />
        <q-btn
          class="action-btn"
          color="cyan"
          icon-right="info"
          label="Instruções"
          @click="showInstructions = true"
        />
        <q-btn
          style="width: 100px"
          color="negative"
          icon="exit_to_app"
          label="Sair"
          @click="exitGame"
          class="action-btn text-weight-bold"
          dense
          unelevated
        />
      </div>

      <!-- Modal de Instruções -->
      <q-dialog v-model="showInstructions">
        <q-card
          class="bg-dark text-white q-pa-md"
          style="max-width: 500px; width: 100%; border: 1px solid #334155"
        >
          <q-card-section class="row items-center justify-between q-pb-none">
            <div class="text-h6 text-weight-bold text-amber">📜 Como Jogar - Campo Minado</div>
            <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
          </q-card-section>

          <q-card-section class="q-gutter-sm text-body2 q-pt-sm">
            <p>
              <strong>🎯 Objetivo:</strong> Explore a masmorra revelando todas as salas seguras sem
              esgotar o HP!
            </p>
            <p><strong>🕹️ Controlos:</strong></p>
            <ul>
              <li>
                <strong>Clique Esquerdo:</strong> Revela uma sala (o primeiro clique é sempre 100%
                seguro).
              </li>
              <li>
                <strong>Clique Direito (ou Shift + Clique):</strong> Marca uma sala suspeita com
                poção (🧪).
              </li>
            </ul>
            <p><strong>❤️ Vida (HP):</strong> Pisar numa armadilha custa 1 HP.</p>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn style="border-radius: 6px" flat label="Entendido" color="amber" v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

import { useRouter } from 'vue-router';

const router = useRouter();

type GameState = 'PLAYING' | 'VICTORY' | 'GAMEOVER';

interface Cell {
  id: number;
  row: number;
  col: number;
  isTrap: boolean;
  isRevealed: boolean;
  isPotionMarked: boolean;
  neighborTraps: number;
}

interface Hero {
  hp: number;
  maxHp: number;
  potions: number;
  score: number;
}

const gridSize = 8;
const totalTraps = 10;
const gameState = ref<GameState>('PLAYING');
const showInstructions = ref(false);
const isFirstClick = ref(true);

interface GameSnapshot {
  grid: Cell[];
  hero: Hero;
  gameState: GameState;
  isFirstClick: boolean;
}

const exitGame = () => {
  // Tenta fechar a aba/janela atual
  window.close();

  // Fallback caso o navegador bloqueie o window.close()
  setTimeout(() => {
    router.push('/');
  }, 100);
};

const moveHistory = ref<GameSnapshot[]>([]);

const hero = ref<Hero>({
  hp: 3,
  maxHp: 3,
  potions: 5,
  score: 0,
});

const createDungeonGrid = (): Cell[] => {
  let idCounter = 0;
  const newGrid: Cell[] = [];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      newGrid.push({
        id: idCounter++,
        row: r,
        col: c,
        isTrap: false,
        isRevealed: false,
        isPotionMarked: false,
        neighborTraps: 0,
      });
    }
  }
  return newGrid;
};

const grid = ref<Cell[]>(createDungeonGrid());

const placeTrapsAndCalculate = (safeRow: number, safeCol: number) => {
  let placedTraps = 0;
  while (placedTraps < totalTraps) {
    const randomIndex = Math.floor(Math.random() * grid.value.length);
    const cell = grid.value[randomIndex];
    if (!cell) continue;

    const isNearSafe = Math.abs(cell.row - safeRow) <= 1 && Math.abs(cell.col - safeCol) <= 1;

    if (!cell.isTrap && !isNearSafe) {
      cell.isTrap = true;
      placedTraps++;
    }
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const index = r * gridSize + c;
      const currentCell = grid.value[index];
      if (!currentCell || currentCell.isTrap) continue;

      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
            const neighborIndex = nr * gridSize + nc;
            if (grid.value[neighborIndex]?.isTrap) {
              count++;
            }
          }
        }
      }
      currentCell.neighborTraps = count;
    }
  }
};

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const playExplosionSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch (e) {
    console.error(e);
  }
};

const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.error(e);
  }
};

const playVictorySound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + index * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.15);
      osc.stop(ctx.currentTime + index * 0.15 + 0.4);
    });
  } catch (e) {
    console.error(e);
  }
};

const saveState = () => {
  const gridCopy = grid.value.map((cell) => ({ ...cell }));
  const heroCopy = { ...hero.value };
  moveHistory.value.push({
    grid: gridCopy,
    hero: heroCopy,
    gameState: gameState.value,
    isFirstClick: isFirstClick.value,
  });
};

const undoMove = () => {
  if (moveHistory.value.length === 0 || gameState.value !== 'PLAYING') return;
  const previousState = moveHistory.value.pop();
  if (previousState) {
    grid.value = previousState.grid;
    hero.value = previousState.hero;
    gameState.value = previousState.gameState;
    isFirstClick.value = previousState.isFirstClick;
  }
};

const initDungeon = () => {
  grid.value = createDungeonGrid();
  hero.value.hp = hero.value.maxHp;
  hero.value.score = 0;
  hero.value.potions = 5;
  gameState.value = 'PLAYING';
  moveHistory.value = [];
  isFirstClick.value = true;
};

const remainingPotions = computed(() => {
  const markedCount = grid.value.filter((c) => c.isPotionMarked).length;
  return Math.max(0, totalTraps - markedCount);
});

const checkVictoryCondition = () => {
  const allSafeRevealed = grid.value.every((cell) => cell.isTrap || cell.isRevealed);
  if (allSafeRevealed && gameState.value === 'PLAYING') {
    gameState.value = 'VICTORY';
    playVictorySound();
  }
};

const revealEmptyCells = (startRow: number, startCol: number) => {
  const queue: [number, number][] = [[startRow, startCol]];
  const visited = new Set<string>();
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const coords = queue.shift();
    if (!coords) continue;
    const [r, c] = coords;
    const index = r * gridSize + c;
    const cell = grid.value[index];
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

        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !visited.has(key)) {
          visited.add(key);
          const neighborIndex = nr * gridSize + nc;
          const neighbor = grid.value[neighborIndex];
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

const chordCell = (cell: Cell) => {
  if (!cell.isRevealed || cell.neighborTraps === 0 || gameState.value !== 'PLAYING') return;

  let markedCount = 0;
  const neighbors: Cell[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dr === 0) continue;
      const nr = cell.row + dr;
      const nc = cell.col + dc;
      if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
        const neighborIndex = nr * gridSize + nc;
        const neighbor = grid.value[neighborIndex];
        if (neighbor) {
          neighbors.push(neighbor);
          if (neighbor.isPotionMarked) {
            markedCount++;
          }
        }
      }
    }
  }

  if (markedCount === cell.neighborTraps) {
    for (const neighbor of neighbors) {
      if (!neighbor.isRevealed && !neighbor.isPotionMarked) {
        revealCell(neighbor);
      }
    }
  }
};

const revealCell = (cell: Cell) => {
  if (cell.isPotionMarked || gameState.value !== 'PLAYING') return;

  if (cell.isRevealed) {
    chordCell(cell);
    return;
  }

  saveState();

  if (isFirstClick.value) {
    placeTrapsAndCalculate(cell.row, cell.col);
    isFirstClick.value = false;
  }

  if (cell.isTrap) {
    cell.isRevealed = true;
    hero.value.hp -= 1;
    playExplosionSound();
    if (hero.value.hp <= 0) {
      gameState.value = 'GAMEOVER';
    }
  } else {
    hero.value.score += 10;
    playSuccessSound();
    if (cell.neighborTraps === 0) {
      revealEmptyCells(cell.row, cell.col);
    } else {
      cell.isRevealed = true;
    }
    checkVictoryCondition();
  }
};

const togglePotion = (cell: Cell) => {
  if (cell.isRevealed || gameState.value !== 'PLAYING') return;
  saveState();
  cell.isPotionMarked = !cell.isPotionMarked;
};

const getNumberColor = (count: number) => {
  const colors: Record<number, string> = {
    1: '#3b82f6',
    2: '#22c55e',
    3: '#ef4444',
    4: '#a855f7',
    5: '#eab308',
    6: '#06b6d4',
    7: '#f97316',
    8: '#ec4899',
  };
  return colors[count] || '#fff';
};
</script>

<style scoped>
/* Wrapper principal responsivo para centrar perfeitamente */
.dungeon-main-wrapper {
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
}

/* Variáveis responsivas para o tamanho das células do grid */
.dungeon-container {
  --tile-size: 42px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #0b0f19;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid #334155;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* Tablet (telas médias) */
@media (max-width: 768px) {
  .dungeon-container {
    --tile-size: 38px;
    padding: 10px;
  }
}

/* Telemóveis (telas pequenas) */
@media (max-width: 480px) {
  .dungeon-container {
    --tile-size: 34px;
    padding: 8px;
  }
}

.dungeon-tile {
  width: var(--tile-size);
  height: var(--tile-size);
  min-width: var(--tile-size);
  min-height: var(--tile-size);
  background-color: #1e293b;
  border: 1px solid #475569;
  border-radius: 4px;
  font-size: calc(var(--tile-size) * 0.45);
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
}

.dungeon-tile:hover {
  background-color: #334155;
}

.dungeon-tile.revealed {
  background-color: #0f172a;
  border: 1px solid #334155;
}

.dungeon-tile.trap-triggered {
  background-color: #7f1d1d;
}

.overlay-bg {
  background-color: rgba(9, 13, 22, 0.95);
  backdrop-filter: blur(6px);
  z-index: 10;
}

@keyframes victoryPulse {
  0% {
    transform: scale(1);
    text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
  }
  50% {
    transform: scale(1.05);
    text-shadow: 0 0 25px rgba(34, 197, 94, 0.9);
  }
  100% {
    transform: scale(1);
    text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
  }
}

.victory-glow {
  animation: victoryPulse 1.5s infinite ease-in-out;
}

.action-btn {
  font-size: 11px;
  border-radius: 6px;
  letter-spacing: 0.4px;
}
</style>
