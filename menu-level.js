'use strict';

/**
 * Selector de nivel inicial del menú de pausa.
 *
 * Monta en `#menu-level-mount` un desplegable con los niveles 1..MAX_START_LEVEL.
 * El valor se guarda mediante `Game.setStartLevel()` (que ya persiste en
 * localStorage) y se aplica a la PRÓXIMA partida, no a la que está en curso.
 */
(function () {
  'use strict';

  const mount = document.getElementById('menu-level-mount');
  if (!mount) return;
  if (typeof Game === 'undefined' || !Game) return;

  /* ---------- Constantes ---------- */

  const FALLBACK_MAX_LEVEL = 15;

  const rawMax = Number(Game.MAX_START_LEVEL);
  const maxLevel =
    Number.isFinite(rawMax) && rawMax >= 1
      ? Math.floor(rawMax)
      : FALLBACK_MAX_LEVEL;

  /* ---------- Helpers ---------- */

  /** Nivel inicial actual, saneado a un entero dentro del rango válido. */
  function currentStartLevel() {
    const n = Math.floor(Number(Game.getStartLevel()));
    if (!Number.isFinite(n)) return 1;
    return Math.min(maxLevel, Math.max(1, n));
  }

  /* ---------- Construcción del bloque ---------- */

  const block = document.createElement('div');
  block.className = 'ml-block';

  const label = document.createElement('label');
  label.className = 'label ml-label';
  label.setAttribute('for', 'menu-level-select');
  label.textContent = 'NIVEL INICIAL';

  const wrap = document.createElement('div');
  wrap.className = 'ml-select-wrap';

  const select = document.createElement('select');
  select.id = 'menu-level-select';
  select.className = 'ml-select';

  for (let i = 1; i <= maxLevel; i++) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = String(i);
    select.appendChild(option);
  }

  const note = document.createElement('p');
  note.className = 'ml-note hidden';
  note.textContent = 'Se aplica en la próxima partida.';

  wrap.appendChild(select);
  block.appendChild(label);
  block.appendChild(wrap);
  block.appendChild(note);
  mount.appendChild(block);

  /* ---------- Sincronización ---------- */

  /** Refleja en el desplegable el nivel inicial realmente guardado. */
  function syncValue() {
    select.value = String(currentStartLevel());
  }

  /**
   * La nota solo tiene sentido con una partida en curso: en la pantalla de
   * inicio el nivel se aplica de inmediato al pulsar JUGAR.
   */
  function syncNote() {
    note.classList.toggle('hidden', !Game.isStarted());
  }

  select.addEventListener('change', function () {
    Game.setStartLevel(select.value);
    // `setStartLevel` recorta el valor al rango válido: reflejamos el resultado.
    syncValue();
  });

  // Al abrir el menú: otro módulo pudo haber cambiado el nivel mientras tanto.
  Game.on('pause', function () {
    syncValue();
    syncNote();
  });

  Game.on('start', syncNote);
  Game.on('restart', syncNote);

  syncValue();
  syncNote();
})();
