'use strict';

/**
 * Capa de datos de la tabla de records (top 5) en localStorage.
 * La UI vive en records-start.js / records-gameover.js / records-reset.js.
 *
 * Forma persistida:
 *   { entries: [{ name, score, lines, level, date }], bestCombo, maxLines }
 */
const Records = {
  MAX: 5,
  MAX_NAME_LENGTH: 12,

  _listeners: [],

  _empty() {
    return { entries: [], bestCombo: 0, maxLines: 0 };
  },

  load() {
    const raw = Storage.get(Storage.KEYS.RECORDS, null);
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.entries)) {
      return this._empty();
    }
    const entries = raw.entries
      .filter(e => e && typeof e === 'object' && Number.isFinite(Number(e.score)))
      .map(e => ({
        name: String(e.name || 'ANON').slice(0, this.MAX_NAME_LENGTH),
        score: Number(e.score) || 0,
        lines: Number(e.lines) || 0,
        level: Number(e.level) || 1,
        date: typeof e.date === 'string' ? e.date : '',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX);
    return {
      entries,
      bestCombo: Number(raw.bestCombo) || 0,
      maxLines: Number(raw.maxLines) || 0,
    };
  },

  _save(data) {
    Storage.set(Storage.KEYS.RECORDS, data);
    this._emit(data);
  },

  /** ¿Esta puntuación entra en el top 5? */
  qualifies(score) {
    const n = Number(score) || 0;
    if (n <= 0) return false;
    const { entries } = this.load();
    if (entries.length < this.MAX) return true;
    return n > entries[entries.length - 1].score;
  },

  /**
   * Inserta una partida. Devuelve el índice donde quedó dentro del top,
   * o -1 si no entró. bestCombo/maxLines se actualizan siempre, entre o no.
   */
  add({ name, score, lines, level, maxCombo, maxLinesAtOnce }) {
    const data = this.load();
    const finalScore = Number(score) || 0;

    data.bestCombo = Math.max(data.bestCombo, Number(maxCombo) || 0);
    data.maxLines = Math.max(data.maxLines, Number(maxLinesAtOnce) || 0);

    const entry = {
      name: String(name || '').trim().slice(0, this.MAX_NAME_LENGTH) || 'ANON',
      score: finalScore,
      lines: Number(lines) || 0,
      level: Number(level) || 1,
      date: new Date().toISOString(),
    };

    data.entries.push(entry);
    data.entries.sort((a, b) => b.score - a.score);
    const index = data.entries.indexOf(entry);
    data.entries = data.entries.slice(0, this.MAX);

    this._save(data);
    return index < this.MAX ? index : -1;
  },

  reset() {
    Storage.remove(Storage.KEYS.RECORDS);
    this._emit(this._empty());
  },

  onChange(fn) {
    if (typeof fn === 'function') this._listeners.push(fn);
  },

  _emit(data) {
    for (const fn of this._listeners) {
      try {
        fn(data);
      } catch (e) {
        console.error('Records listener error:', e);
      }
    }
  },
};
