'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - pale blue
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const MAX_START_LEVEL = 15;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const startScreen = document.getElementById('start-screen');
const playBtn = document.getElementById('play-btn');
const pauseMenu = document.getElementById('pause-menu');
const menuResumeBtn = document.getElementById('menu-resume');
const menuRestartBtn = document.getElementById('menu-restart');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval;
let combo, maxCombo, maxLinesAtOnce;
let started = false;
let startLevel = 1;
let animId = null;
let gridLineColor;

/* ---------- Render enchufable (lo consumen las skins) ---------- */

let palette = COLORS;
let boardDecorator = null;

function defaultBlockRenderer(context, px, py, size, color, alpha) {
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(px + 1, py + 1, size - 2, 4);
}

let blockRenderer = defaultBlockRenderer;

/* ---------- Tema ---------- */

function readCanvasThemeColors() {
  gridLineColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  Storage.set(Storage.KEYS.THEME, theme);
  readCanvasThemeColors();
  Game.redraw();
}

function initTheme() {
  const saved = Storage.get(Storage.KEYS.THEME, 'dark');
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

themeToggleBtn.addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  applyTheme(isLight ? 'dark' : 'light');
});

/* ---------- Mecánica ---------- */

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function getDropInterval(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

/** Limpia filas completas y devuelve cuántas se limpiaron. */
function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = startLevel + Math.floor(lines / 10);
    dropInterval = getDropInterval(level);
    if (cleared > maxLinesAtOnce) maxLinesAtOnce = cleared;
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  const cleared = clearLines();
  if (cleared > 0) {
    combo++;
    if (combo > maxCombo) maxCombo = combo;
  } else {
    combo = 0;
  }
  updateHUD();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  drawNext();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  if (comboEl) comboEl.textContent = combo > 1 ? `x${combo}` : '—';
}

/* ---------- Dibujo ---------- */

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = palette[colorIndex] || COLORS[colorIndex];
  context.save();
  try {
    blockRenderer(context, x * size, y * size, size, color, alpha ?? 1, colorIndex);
  } finally {
    context.restore();
  }
}

function drawGrid() {
  ctx.strokeStyle = gridLineColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (boardDecorator) {
    ctx.save();
    try {
      boardDecorator(ctx, canvas, { cols: COLS, rows: ROWS, block: BLOCK });
    } finally {
      ctx.restore();
    }
  }

  ctx.save();
  drawGrid();
  ctx.restore();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

/* ---------- Estado de partida ---------- */

function endGame() {
  if (gameOver) return;
  gameOver = true;
  if (animId !== null) cancelAnimationFrame(animId);
  animId = null;
  Game.inputLocked = true;
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
  Game.emit('gameover', Game.getStats());
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  combo = 0;
  maxCombo = 0;
  maxLinesAtOnce = 0;
  paused = false;
  gameOver = false;
  started = true;
  dropInterval = getDropInterval(level);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  startScreen.classList.add('hidden');
  Game.inputLocked = false;
  if (animId !== null) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function loop(ts) {
  if (gameOver || paused) { animId = null; return; }
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver || paused) { animId = null; return; }
  animId = requestAnimationFrame(loop);
}

/* ---------- API pública ---------- */

const Game = {
  inputLocked: true,

  _listeners: {},

  on(name, fn) {
    if (typeof fn !== 'function') return;
    (this._listeners[name] || (this._listeners[name] = [])).push(fn);
  },

  emit(name, payload) {
    const fns = this._listeners[name];
    if (!fns) return;
    for (const fn of fns) {
      try {
        fn(payload);
      } catch (e) {
        console.error(`Game "${name}" listener error:`, e);
      }
    }
  },

  start() {
    init();
    this.emit('start', this.getStats());
  },

  restart() {
    startLevel = this.getStartLevel();
    init();
    this.emit('restart', this.getStats());
  },

  pause() {
    if (!started || gameOver || paused) return;
    paused = true;
    if (animId !== null) cancelAnimationFrame(animId);
    animId = null;
    this.inputLocked = true;
    showMenuMain();
    pauseMenu.classList.remove('hidden');
    if (menuResumeBtn) menuResumeBtn.focus();
    this.emit('pause', this.getStats());
  },

  resume() {
    if (!started || gameOver || !paused) return;
    paused = false;
    pauseMenu.classList.add('hidden');
    lastTime = performance.now();
    if (animId !== null) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
    this.emit('resume', this.getStats());
    // Se desbloquea un frame más tarde: evita que el mismo keydown que cierra
    // el menú (o una tecla aún pulsada) mueva la pieza al volver.
    requestAnimationFrame(() => {
      if (started && !paused && !gameOver) this.inputLocked = false;
    });
  },

  togglePause() {
    if (paused) this.resume();
    else this.pause();
  },

  isStarted() { return started; },
  isPaused() { return paused; },
  isGameOver() { return gameOver; },

  getStats() {
    return {
      score: score || 0,
      lines: lines || 0,
      level: level || 1,
      combo: combo || 0,
      maxCombo: maxCombo || 0,
      maxLinesAtOnce: maxLinesAtOnce || 0,
    };
  },

  getStartLevel() {
    const n = Math.floor(Number(Storage.get(Storage.KEYS.START_LEVEL, 1)));
    if (!Number.isFinite(n)) return 1;
    return Math.min(MAX_START_LEVEL, Math.max(1, n));
  },

  /** Se aplica a la próxima partida, no a la actual. */
  setStartLevel(n) {
    const lvl = Math.min(MAX_START_LEVEL, Math.max(1, Math.floor(Number(n)) || 1));
    Storage.set(Storage.KEYS.START_LEVEL, lvl);
    if (!started) startLevel = lvl;
    return lvl;
  },

  get MAX_START_LEVEL() { return MAX_START_LEVEL; },

  /* -- Puntos de extensión de las skins -- */

  setPalette(colors) {
    palette = Array.isArray(colors) && colors.length >= COLORS.length ? colors : COLORS;
  },

  setBlockRenderer(fn) {
    blockRenderer = typeof fn === 'function' ? fn : defaultBlockRenderer;
  },

  setBoardDecorator(fn) {
    boardDecorator = typeof fn === 'function' ? fn : null;
  },

  getDefaultPalette() { return COLORS.slice(); },
  getDefaultBlockRenderer() { return defaultBlockRenderer; },

  /** Repinta inmediatamente (skins / tema cambian sin esperar al próximo frame). */
  redraw() {
    if (!board || !current || !next) return;
    draw();
    drawNext();
  },

  boot() {
    startLevel = this.getStartLevel();
    this.inputLocked = true;
    overlay.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    startScreen.classList.remove('hidden');
    this.emit('boot');
  },
};

/* ---------- Menú de pausa: shell ---------- */

/**
 * Devuelve el menú a su vista principal. Las subvistas las añaden otros
 * módulos marcándolas con la clase `menu-subview`.
 */
function showMenuMain() {
  const main = document.getElementById('menu-main');
  if (main) main.classList.remove('hidden');
  for (const view of pauseMenu.querySelectorAll('.menu-subview')) {
    view.classList.add('hidden');
  }
}

if (menuResumeBtn) menuResumeBtn.addEventListener('click', () => Game.resume());
if (menuRestartBtn) menuRestartBtn.addEventListener('click', () => Game.restart());
if (playBtn) playBtn.addEventListener('click', () => Game.start());
restartBtn.addEventListener('click', () => Game.restart());

/* ---------- Input ---------- */

/** ¿El foco está en un campo editable? Entonces el juego no toca la tecla. */
function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

document.addEventListener('keydown', e => {
  if (isTypingTarget(e.target) && e.code !== 'Escape') return;

  // Teclas globales: funcionan aunque el input del juego esté bloqueado.
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (started && !gameOver) {
      e.preventDefault();
      Game.togglePause();
    }
    return;
  }

  if (Game.inputLocked || paused || gameOver || !started) return;

  switch (e.code) {
    case 'ArrowLeft':
      e.preventDefault();
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      e.preventDefault();
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      e.preventDefault();
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      e.preventDefault();
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    default:
      return;
  }
  updateHUD();
});
