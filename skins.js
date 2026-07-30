'use strict';

/**
 * Registro de skins. Cada skin vive en su propio archivo (skin-*.js) y se
 * registra llamando a Skins.register(). Este módulo solo guarda, aplica y
 * persiste; no conoce ninguna skin concreta salvo la base "retro".
 *
 * Contrato de una skin:
 *   {
 *     id: 'neon',
 *     name: 'Neon',
 *     colors: [null, '#...', ... 7 colores],          // opcional
 *     drawBlock(ctx, px, py, size, color, alpha, i),  // opcional
 *     decorateBoard(ctx, canvas, dims),               // opcional (fondo)
 *   }
 */
const Skins = {
  DEFAULT_ID: 'retro',

  _skins: new Map(),
  _activeId: null,
  _listeners: [],

  register(skin) {
    if (!skin || !skin.id) return;
    this._skins.set(skin.id, skin);
    // Si es la skin que el usuario tenía guardada y aún no se pudo aplicar
    // (el archivo se cargó después de init), aplicarla ahora.
    const wanted = Storage.get(Storage.KEYS.SKIN, this.DEFAULT_ID);
    if (this._activeId !== null && wanted === skin.id && this._activeId !== skin.id) {
      this.apply(skin.id);
    } else {
      this._emit();
    }
  },

  list() {
    return Array.from(this._skins.values()).map(s => ({ id: s.id, name: s.name || s.id }));
  },

  get(id) { return this._skins.get(id) || null; },

  getActiveId() { return this._activeId; },

  apply(id) {
    const skin = this._skins.get(id) || this._skins.get(this.DEFAULT_ID);
    if (!skin) return false;

    this._activeId = skin.id;
    document.documentElement.setAttribute('data-skin', skin.id);
    Game.setPalette(skin.colors || Game.getDefaultPalette());
    Game.setBlockRenderer(skin.drawBlock || Game.getDefaultBlockRenderer());
    Game.setBoardDecorator(skin.decorateBoard || null);
    Storage.set(Storage.KEYS.SKIN, skin.id);
    // El color de la rejilla es una var CSS que la skin puede haber cambiado.
    if (typeof readCanvasThemeColors === 'function') readCanvasThemeColors();
    Game.redraw();
    this._emit();
    return true;
  },

  init() {
    const saved = Storage.get(Storage.KEYS.SKIN, this.DEFAULT_ID);
    this.apply(this._skins.has(saved) ? saved : this.DEFAULT_ID);
  },

  onChange(fn) {
    if (typeof fn === 'function') this._listeners.push(fn);
  },

  _emit() {
    for (const fn of this._listeners) {
      try {
        fn(this._activeId, this.list());
      } catch (e) {
        console.error('Skins listener error:', e);
      }
    }
  },
};

// Skin base: exactamente el aspecto actual del juego.
Skins.register({
  id: 'retro',
  name: 'Retro',
  colors: null,
  drawBlock: null,
  decorateBoard: null,
});
