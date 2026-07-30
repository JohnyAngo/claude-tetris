'use strict';

/**
 * Menú de pausa — subvista de controles.
 *
 * `#menu-controls-btn` oculta `#menu-main` y muestra `#menu-controls-view`;
 * el botón "Volver" hace lo inverso. La lista de teclas se construye por nodos.
 *
 * game.js ya restaura la vista principal cada vez que se abre el menú
 * (recorre `#pause-menu .menu-subview` y las oculta), así que aquí no hace
 * falta resetear nada al pausar.
 */
(function () {
  'use strict';

  const view = document.getElementById('menu-controls-view');
  const main = document.getElementById('menu-main');
  const openBtn = document.getElementById('menu-controls-btn');

  // Si falta cualquier punto de montaje, el módulo simplemente no hace nada.
  if (!view || !main || !openBtn) return;

  /**
   * Filas de la tabla de controles.
   * `sep` (opcional) se intercala entre teclas alternativas; sin él las teclas
   * van juntas (se pulsan indistintamente / forman un grupo).
   * `hint` (opcional) es el nombre técnico en inglés, como apoyo.
   */
  const ROWS = [
    { keys: ['←', '→'], desc: 'mover' },
    { keys: ['↑', 'X'], sep: 'o', desc: 'rotar' },
    { keys: ['↓'], desc: 'bajada rápida', hint: '(soft drop)' },
    { keys: ['Espacio'], desc: 'caída instantánea', hint: '(hard drop)' },
    { keys: ['P', 'Esc'], sep: 'o', desc: 'pausa / cerrar menú' },
  ];

  /** Construye el `<span>` con las teclas de una fila. */
  function buildKeys(row) {
    const keys = document.createElement('span');
    keys.className = 'mc-keys';

    row.keys.forEach((key, i) => {
      if (i > 0 && row.sep) {
        const sep = document.createElement('span');
        sep.className = 'mc-sep';
        sep.textContent = row.sep;
        keys.appendChild(sep);
      }
      const kbd = document.createElement('kbd');
      kbd.textContent = key;
      keys.appendChild(kbd);
    });

    return keys;
  }

  /** Construye el `<span>` con la descripción de una fila. */
  function buildDesc(row) {
    const desc = document.createElement('span');
    desc.className = 'mc-desc';
    desc.textContent = row.desc;

    if (row.hint) {
      const hint = document.createElement('span');
      hint.className = 'mc-hint';
      hint.textContent = row.hint;
      desc.appendChild(hint);
    }

    return desc;
  }

  function buildRow(row) {
    const li = document.createElement('li');
    li.className = 'mc-row';
    li.appendChild(buildKeys(row));
    li.appendChild(buildDesc(row));
    return li;
  }

  function showView() {
    main.classList.add('hidden');
    view.classList.remove('hidden');
    backBtn.focus();
  }

  function hideView() {
    view.classList.add('hidden');
    main.classList.remove('hidden');
    openBtn.focus();
  }

  /* ---------- Montaje ---------- */

  view.textContent = '';

  const panel = document.createElement('div');
  panel.className = 'mc-panel';

  const title = document.createElement('span');
  title.className = 'label mc-title';
  title.textContent = 'CONTROLES';
  panel.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'mc-list';
  for (const row of ROWS) list.appendChild(buildRow(row));
  panel.appendChild(list);

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'menu-btn mc-back';
  backBtn.textContent = 'Volver';
  backBtn.addEventListener('click', hideView);
  panel.appendChild(backBtn);

  view.appendChild(panel);

  openBtn.addEventListener('click', showView);
})();
