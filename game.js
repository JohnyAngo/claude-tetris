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
const overlayStats = document.getElementById('overlay-stats');
const overlayRecords = document.getElementById('overlay-records');
const overlayActions = document.querySelector('.overlay-actions');
const nameForm = document.getElementById('name-form');
const playerNameInput = document.getElementById('player-name');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const startScreen = document.getElementById('start-screen');
const startRecords = document.getElementById('start-records');
const startBtn = document.getElementById('start-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

const THEME_STORAGE_KEY = 'tetris-theme';
const RECORDS_STORAGE_KEY = 'tetris-records';
const LAST_NAME_STORAGE_KEY = 'tetris-last-name';
const MAX_RECORDS = 5;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval;
let combo, maxCombo, started = false;
let pendingRun = null;
let animId = null;
let gridLineColor;

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
  if (!started) drawIdleBoard();
  else if (paused) { draw(); drawNext(); }
});

/* ---- Tabla de records (localStorage) ---- */

function loadRecords() {
  let raw;
  try {
    raw = localStorage.getItem(RECORDS_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(r => r && Number.isFinite(r.score))
    .map(r => ({
      name: String(r.name || 'ANON').slice(0, 12),
      score: r.score,
      lines: Number(r.lines) || 0,
      level: Number(r.level) || 1,
      combo: Number(r.combo) || 0,
      date: typeof r.date === 'string' ? r.date : null,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECORDS);
}

function saveRecords(list) {
  try {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* almacenamiento no disponible: los records solo duran la sesión */
  }
}

function isTopScore(value) {
  if (value <= 0) return false;
  const list = loadRecords();
  return list.length < MAX_RECORDS || value > list[list.length - 1].score;
}

function addRecord(entry) {
  const list = loadRecords();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, MAX_RECORDS);
  saveRecords(trimmed);
  return trimmed.indexOf(entry);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// previewEntry: partida en curso, insertada sin guardar para mostrar dónde caería.
// highlightIndex: fila a resaltar cuando el record ya está guardado.
function renderRecords(container, { previewEntry = null, highlightIndex = -1 } = {}) {
  const stored = loadRecords();
  let list = stored;
  let highlight = highlightIndex;

  if (previewEntry) {
    list = stored.concat([previewEntry]).sort((a, b) => b.score - a.score).slice(0, MAX_RECORDS);
    highlight = list.indexOf(previewEntry);
  }

  const bestCombo = stored.reduce((m, r) => Math.max(m, r.combo), 0);
  const bestLines = stored.reduce((m, r) => Math.max(m, r.lines), 0);

  const rows = list.map((r, i) => `
    <tr class="${i === highlight ? 'highlight' : ''}">
      <td class="rank">${i + 1}</td>
      <td class="name">${escapeHtml(r.name)}</td>
      <td class="num">${r.score.toLocaleString()}</td>
      <td class="num">${r.lines}</td>
      <td class="num">${r.combo}</td>
    </tr>`).join('');

  const table = list.length
    ? `<table class="records-table">
         <thead>
           <tr><th>#</th><th>NOMBRE</th><th>PUNTOS</th><th>LÍN.</th><th>COMBO</th></tr>
         </thead>
         <tbody>${rows}</tbody>
       </table>`
    : '<p class="records-empty">Todavía no hay records</p>';

  container.innerHTML = `
    <span class="label">TOP ${MAX_RECORDS}</span>
    ${table}
    <p class="records-bests">Mejor combo: <strong>${bestCombo}</strong> · Líneas máximas: <strong>${bestLines}</strong></p>`;
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
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    score += 50 * (combo - 1) * level; // bonus por cadena de limpiezas consecutivas
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  } else {
    combo = 0;
  }
  updateHUD();
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
  comboEl.textContent = combo > 0 ? `x${combo}` : '—';
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
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
  started = false;
  if (animId !== null) cancelAnimationFrame(animId);
  animId = null;

  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlayStats.textContent = `Líneas: ${lines} · Nivel: ${level} · Mejor combo: ${maxCombo}`;
  overlayStats.classList.remove('hidden');
  overlayRecords.classList.remove('hidden');
  overlayActions.classList.remove('hidden');

  if (isTopScore(score)) {
    pendingRun = {
      name: '',
      score,
      lines,
      level,
      combo: maxCombo,
      date: new Date().toISOString(),
    };
    nameForm.classList.remove('hidden');
    let lastName = '';
    try { lastName = localStorage.getItem(LAST_NAME_STORAGE_KEY) || ''; } catch { /* ignorar */ }
    playerNameInput.value = lastName;
    renderRecords(overlayRecords, { previewEntry: { ...pendingRun, name: 'TÚ' } });
  } else {
    pendingRun = null;
    nameForm.classList.add('hidden');
    renderRecords(overlayRecords);
  }

  overlay.classList.remove('hidden');
  if (pendingRun) playerNameInput.focus();
}

function togglePause() {
  if (gameOver || !started) return;
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  } else {
    if (animId !== null) cancelAnimationFrame(animId);
    animId = null;
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
    overlayStats.classList.add('hidden');
    overlayRecords.classList.add('hidden');
    nameForm.classList.add('hidden');
    overlayActions.classList.remove('hidden');
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
  combo = 0;
  maxCombo = 0;
  paused = false;
  gameOver = false;
  started = true;
  pendingRun = null;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  overlay.classList.add('hidden');
  startScreen.classList.add('hidden');
  if (animId !== null) cancelAnimationFrame(animId);
  animId = null;
  next = randomPiece();
  spawn(); // puede terminar la partida al instante: endGame() vuelve a mostrar el overlay
  updateHUD();
  if (!gameOver) animId = requestAnimationFrame(loop);
}

function drawIdleBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
}

function showStartScreen() {
  started = false;
  paused = false;
  gameOver = false;
  pendingRun = null;
  if (animId !== null) cancelAnimationFrame(animId);
  animId = null;
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  maxCombo = 0;
  updateHUD();
  drawIdleBoard();
  disarmReset();
  renderRecords(startRecords);
  overlay.classList.add('hidden');
  startScreen.classList.remove('hidden');
}

document.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) return;
  if (!started) return;
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

restartBtn.addEventListener('click', () => {
  if (paused) { togglePause(); return; }
  init();
});

menuBtn.addEventListener('click', showStartScreen);
startBtn.addEventListener('click', init);

nameForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!pendingRun) return;
  const name = playerNameInput.value.trim().slice(0, 12) || 'ANON';
  pendingRun.name = name;
  try { localStorage.setItem(LAST_NAME_STORAGE_KEY, name); } catch { /* ignorar */ }
  const index = addRecord(pendingRun);
  pendingRun = null;
  nameForm.classList.add('hidden');
  renderRecords(overlayRecords, { highlightIndex: index });
});

/* Reset en dos pasos: evita diálogos modales del navegador. */
let resetArmed = false;
let resetTimer = null;

function disarmReset() {
  resetArmed = false;
  if (resetTimer !== null) clearTimeout(resetTimer);
  resetTimer = null;
  resetRecordsBtn.textContent = 'Resetear records';
  resetRecordsBtn.classList.remove('danger');
}

resetRecordsBtn.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    resetRecordsBtn.textContent = 'Pulsa otra vez para borrar';
    resetRecordsBtn.classList.add('danger');
    resetTimer = setTimeout(disarmReset, 4000);
    return;
  }
  try { localStorage.removeItem(RECORDS_STORAGE_KEY); } catch { /* ignorar */ }
  disarmReset();
  renderRecords(startRecords);
});

initTheme();
showStartScreen();
