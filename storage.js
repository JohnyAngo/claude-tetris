'use strict';

/**
 * Wrapper sobre localStorage con JSON y tolerancia a fallos
 * (modo incógnito, cuota llena, storage deshabilitado).
 */
const Storage = {
  KEYS: {
    THEME: 'tetris-theme',
    SKIN: 'tetris-skin',
    RECORDS: 'tetris-records',
    START_LEVEL: 'tetris-start-level',
  },

  get(key, fallback) {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      return fallback;
    }
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      // Valor guardado por una versión anterior como string plano.
      return raw;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  },
};
