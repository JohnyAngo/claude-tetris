'use strict';

/**
 * Tabla de records (top 5) en la pantalla de inicio.
 *
 * Monta en #start-records-list. Sólo renderiza la lista: las estadísticas
 * globales y el botón de borrado viven en otra unidad (#start-records-stats
 * y #start-records-reset).
 */
(function () {
  'use strict';

  const mount = document.getElementById('start-records-list');
  if (!mount) return;
  if (typeof Records === 'undefined') return;

  /** Crea un elemento con clase y texto opcionales. */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    // Siempre textContent: los nombres los escribe el usuario.
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  /** "45 líneas · nivel 3" */
  function metaText(entry) {
    const lines = Number(entry.lines) || 0;
    const level = Number(entry.level) || 1;
    return `${lines} ${lines === 1 ? 'línea' : 'líneas'} · nivel ${level}`;
  }

  function buildRow(entry, index) {
    const row = el('li', 'rs-row');

    row.appendChild(el('span', 'rs-pos', `${index + 1}.`));

    const main = el('span', 'rs-main');
    main.appendChild(el('span', 'rs-name', entry.name));
    main.appendChild(el('span', 'rs-meta', metaText(entry)));
    row.appendChild(main);

    const score = Number(entry.score) || 0;
    row.appendChild(el('span', 'rs-score', score.toLocaleString()));

    return row;
  }

  function render(data) {
    const entries =
      data && Array.isArray(data.entries) ? data.entries : Records.load().entries;

    mount.textContent = '';

    const wrap = el('div', 'rs-wrap');
    wrap.appendChild(el('span', 'label', 'RECORDS'));

    if (!entries.length) {
      wrap.appendChild(el('p', 'rs-empty', 'Aún no hay records. ¡Juega una partida!'));
    } else {
      const list = el('ol', 'rs-list');
      // list-style:none puede quitar la semántica de lista en algunos lectores.
      list.setAttribute('role', 'list');
      entries.slice(0, Records.MAX).forEach((entry, i) => {
        list.appendChild(buildRow(entry, i));
      });
      wrap.appendChild(list);
    }

    mount.appendChild(wrap);
  }

  Records.onChange(render);

  // Al volver a la pantalla de inicio los datos pueden haber cambiado.
  if (typeof Game !== 'undefined') Game.on('boot', () => render());

  render();
})();
