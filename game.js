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

/* ---- Utilidades de color ---- */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

// amount > 0 aclara hacia blanco, < 0 oscurece hacia negro
function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (v) => amount >= 0
    ? Math.round(v + (255 - v) * amount)
    : Math.round(v * (1 + amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRectPath(context, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

/* ---- Skins ---- */

// Cada skin define su paleta (índice 1..7 = I,O,T,S,Z,J,L) y su función de
// dibujo de bloque. La función recibe coordenadas en píxeles ya resueltas.

function drawRetroBlock(context, px, py, color, size) {
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(px + 1, py + 1, size - 2, 4);
}

function drawNeonBlock(context, px, py, color, size) {
  const inset = 2.5;
  context.shadowColor = color;
  context.shadowBlur = size * 0.45;

  // relleno tenue con glow
  context.fillStyle = rgba(color, 0.22);
  context.fillRect(px + inset, py + inset, size - inset * 2, size - inset * 2);

  // contorno brillante (doble pasada para intensificar el halo)
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.strokeRect(px + inset, py + inset, size - inset * 2, size - inset * 2);
  context.strokeRect(px + inset, py + inset, size - inset * 2, size - inset * 2);

  // núcleo casi blanco, sin sombra
  context.shadowBlur = 0;
  context.fillStyle = shade(color, 0.55);
  context.fillRect(px + size / 2 - 2, py + size / 2 - 2, 4, 4);

  context.shadowColor = 'transparent';
}

function drawPastelBlock(context, px, py, color, size) {
  const inset = 2;
  const w = size - inset * 2;
  const radius = size * 0.28;

  roundRectPath(context, px + inset, py + inset, w, w, radius);
  context.fillStyle = color;
  context.fill();

  // brillo superior suave
  roundRectPath(context, px + inset + 3, py + inset + 3, w - 6, w * 0.4, radius * 0.6);
  context.fillStyle = 'rgba(255,255,255,0.45)';
  context.fill();

  // borde apenas más oscuro para separar bloques contiguos
  roundRectPath(context, px + inset, py + inset, w, w, radius);
  context.strokeStyle = shade(color, -0.18);
  context.lineWidth = 1;
  context.stroke();
}

function drawPixelBlock(context, px, py, color, size) {
  const p = Math.max(2, Math.round(size / 10)); // tamaño del "píxel" lógico

  context.fillStyle = color;
  context.fillRect(px, py, size, size);

  // bisel 8-bit: luz arriba/izquierda, sombra abajo/derecha
  context.fillStyle = shade(color, 0.38);
  context.fillRect(px, py, size, p);
  context.fillRect(px, py, p, size);
  context.fillStyle = shade(color, -0.42);
  context.fillRect(px, py + size - p, size, p);
  context.fillRect(px + size - p, py, p, size);

  // textura de dithering
  context.fillStyle = shade(color, 0.2);
  context.fillRect(px + p * 2, py + p * 2, p, p);
  context.fillRect(px + p * 4, py + p * 3, p, p);
  context.fillStyle = shade(color, -0.25);
  context.fillRect(px + p * 6, py + p * 5, p, p);
  context.fillRect(px + p * 3, py + p * 6, p, p);

  context.strokeStyle = 'rgba(0,0,0,0.45)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
}

const SKINS = {
  retro: {
    label: 'Retro',
    colors: COLORS,
    draw: drawRetroBlock,
  },
  neon: {
    label: 'Neon',
    colors: [null, '#00f5ff', '#fff200', '#c400ff', '#00ff6a', '#ff0055', '#0066ff', '#ff9500'],
    draw: drawNeonBlock,
  },
  pastel: {
    label: 'Pastel',
    colors: [null, '#a8e6e4', '#fdf1a7', '#d8bfe8', '#b7e4c7', '#f7b7b7', '#a9c8f0', '#ffd6a5'],
    draw: drawPastelBlock,
  },
  pixel: {
    label: 'Pixel art',
    colors: [null, '#3cbcbc', '#e8d84c', '#9c4cbc', '#4cbc4c', '#d43c3c', '#3c5cd4', '#e08c2c'],
    draw: drawPixelBlock,
  },
};

const DEFAULT_SKIN = 'retro';

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

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

const THEME_STORAGE_KEY = 'tetris-theme';
const SKIN_STORAGE_KEY = 'tetris-skin';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval;
let animId = null;
let gridLineColor;
let skin = SKINS[DEFAULT_SKIN];

function readCanvasThemeColors() {
  gridLineColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  readCanvasThemeColors();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

themeToggleBtn.addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  applyTheme(isLight ? 'dark' : 'light');
  redraw();
});

function applySkin(name) {
  const key = SKINS[name] ? name : DEFAULT_SKIN;
  skin = SKINS[key];
  document.documentElement.setAttribute('data-skin', key);
  skinSelect.value = key;
  localStorage.setItem(SKIN_STORAGE_KEY, key);
  readCanvasThemeColors();
}

function initSkin() {
  for (const [key, value] of Object.entries(SKINS)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = value.label;
    skinSelect.appendChild(option);
  }
  applySkin(localStorage.getItem(SKIN_STORAGE_KEY) || DEFAULT_SKIN);
}

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  redraw();
});

// Repinta ambos canvas sin depender del bucle (útil en pausa o game over)
function redraw() {
  if (!current) return;
  draw();
  drawNext();
}

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
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
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
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
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
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = skin.colors[colorIndex];
  context.save();
  context.globalAlpha = alpha ?? 1;
  skin.draw(context, x * size, y * size, color, size);
  context.restore();
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
  drawGrid();

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

function endGame() {
  if (gameOver) return;
  gameOver = true;
  if (animId !== null) cancelAnimationFrame(animId);
  animId = null;
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    if (animId !== null) cancelAnimationFrame(animId);
    animId = null;
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
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

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  if (animId !== null) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

initTheme();
initSkin();
init();
