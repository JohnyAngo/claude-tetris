'use strict';

/**
 * Skin "Neon": tablero negro y piezas que brillan como tubos de neón.
 *
 * El motor envuelve cada llamada a drawBlock/decorateBoard en save()/restore(),
 * así que aquí se puede ensuciar el contexto sin limpiarlo después.
 */
(function () {
  'use strict';

  if (typeof Skins === 'undefined' || typeof Skins.register !== 'function') return;

  // Índice 0 sin usar; 1..7 = I, O, T, S, Z, J, L.
  // Nombre propio para no confundirse con el COLORS global de game.js.
  const NEON_COLORS = [
    null,
    '#00f0ff', // I - cian eléctrico
    '#ffe600', // O - amarillo
    '#c400ff', // T - violeta / magenta
    '#39ff14', // S - verde lima
    '#ff1e6d', // Z - rojo rosado
    '#2979ff', // J - azul eléctrico
    '#ff8f00', // L - naranja
  ];

  const BOARD_BG = '#05050a';

  /**
   * Bloque relleno con halo (shadowBlur) más un borde interior claro que
   * simula el cristal encendido de un tubo de neón.
   */
  function drawBlock(ctx, px, py, size, color, alpha) {
    const inset = Math.max(1, size * 0.08);
    const x = px + inset;
    const y = py + inset;
    const side = size - inset * 2;
    if (side <= 0) return;

    ctx.globalAlpha = alpha;

    // Halo: proporcional al tamaño y atenuado por alpha, para que la pieza
    // fantasma (alpha 0.2) apenas brille.
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.4 * alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, side, side);

    // Borde interior: sin halo para que quede nítido sobre el relleno.
    ctx.shadowBlur = 0;
    const lw = Math.max(1, size * 0.07);
    if (side > lw * 2) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.strokeRect(x + lw / 2, y + lw / 2, side - lw, side - lw);
    }
  }

  /** Fondo del tablero: negro casi puro para que el neón resalte. */
  function decorateBoard(ctx, canvas) {
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  Skins.register({
    id: 'neon',
    name: 'Neon',
    colors: NEON_COLORS,
    drawBlock: drawBlock,
    decorateBoard: decorateBoard,
  });
})();
