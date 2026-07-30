'use strict';

/**
 * Unidad 5: estadísticas históricas y borrado de records.
 *
 * Monta en:
 *   #start-records-stats  -> "MEJOR COMBO" / "MÁX. LÍNEAS" (Records.load()).
 *   #start-records-reset  -> botón "Borrar records" con confirmación inline.
 *
 * La tabla del top 5 la monta otra unidad en #start-records-list.
 * Nunca usamos confirm()/alert(): congelan la automatización.
 */
(function () {
  'use strict';

  const NOTICE_MS = 2000;
  const EMPTY = '—';

  const statsMount = document.getElementById('start-records-stats');
  const resetMount = document.getElementById('start-records-reset');

  // Sin puntos de montaje o sin capa de datos no hay nada que hacer.
  if (!statsMount && !resetMount) return;
  if (typeof Records === 'undefined') return;

  /* ---------- Estadísticas históricas ---------- */

  /** Crea un bloque etiqueta/valor. El valor va en monoespaciada + acento. */
  function createStat(labelText, valueText) {
    const box = document.createElement('div');
    box.className = 'rr-stat';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = 'rr-stat-value';
    value.textContent = valueText;

    box.appendChild(label);
    box.appendChild(value);
    return box;
  }

  function renderStats() {
    if (!statsMount) return;

    let data;
    try {
      data = Records.load();
    } catch (e) {
      console.error('Records.load error:', e);
      return;
    }

    const bestCombo = Number(data && data.bestCombo) || 0;
    const maxLines = Number(data && data.maxLines) || 0;

    const row = document.createElement('div');
    row.className = 'rr-stats';
    row.appendChild(createStat('MEJOR COMBO', bestCombo > 0 ? 'x' + bestCombo : EMPTY));
    row.appendChild(createStat('MÁX. LÍNEAS', maxLines > 0 ? String(maxLines) : EMPTY));

    statsMount.textContent = '';
    statsMount.appendChild(row);
  }

  /* ---------- Borrado con confirmación inline ---------- */

  let bodyEl = null;
  let noticeEl = null;
  let noticeTimer = null;

  function buildResetShell() {
    const root = document.createElement('div');
    root.className = 'rr-reset';

    bodyEl = document.createElement('div');
    bodyEl.className = 'rr-reset-body';

    noticeEl = document.createElement('p');
    noticeEl.className = 'rr-notice hidden';
    noticeEl.setAttribute('role', 'status');
    noticeEl.setAttribute('aria-live', 'polite');
    noticeEl.textContent = 'Records borrados';

    root.appendChild(bodyEl);
    root.appendChild(noticeEl);

    resetMount.textContent = '';
    resetMount.appendChild(root);
  }

  /** Oculta el aviso y cancela su temporizador (evita timers solapados). */
  function clearNotice() {
    if (noticeTimer !== null) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    if (noticeEl) noticeEl.classList.add('hidden');
  }

  /** Muestra "Records borrados" ~2 s, reiniciando cualquier temporizador previo. */
  function showNotice() {
    if (!noticeEl) return;
    if (noticeTimer !== null) clearTimeout(noticeTimer);
    noticeEl.classList.remove('hidden');
    noticeTimer = setTimeout(function () {
      noticeTimer = null;
      noticeEl.classList.add('hidden');
    }, NOTICE_MS);
  }

  /** Estado inicial: un único botón "Borrar records". */
  function showIdle(focusIt) {
    if (!bodyEl) return;
    bodyEl.textContent = '';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn rr-reset-btn';
    btn.textContent = 'Borrar records';
    btn.addEventListener('click', function () {
      showConfirm();
    });

    bodyEl.appendChild(btn);
    if (focusIt) btn.focus();
  }

  /** Estado de confirmación: texto + "Sí, borrar" / "Cancelar". */
  function showConfirm() {
    if (!bodyEl) return;
    clearNotice();
    bodyEl.textContent = '';

    const box = document.createElement('div');
    box.className = 'rr-confirm';

    const text = document.createElement('p');
    text.className = 'rr-confirm-text';
    text.textContent = '¿Seguro? Se borrará todo.';

    const actions = document.createElement('div');
    actions.className = 'rr-confirm-actions';

    const yesBtn = document.createElement('button');
    yesBtn.type = 'button';
    yesBtn.className = 'menu-btn rr-danger';
    yesBtn.textContent = 'Sí, borrar';
    yesBtn.addEventListener('click', function () {
      try {
        Records.reset();
      } catch (e) {
        console.error('Records.reset error:', e);
      }
      showIdle(true);
      showNotice();
    });

    const noBtn = document.createElement('button');
    noBtn.type = 'button';
    noBtn.className = 'menu-btn';
    noBtn.textContent = 'Cancelar';
    noBtn.addEventListener('click', function () {
      showIdle(true);
    });

    actions.appendChild(yesBtn);
    actions.appendChild(noBtn);
    box.appendChild(text);
    box.appendChild(actions);
    bodyEl.appendChild(box);

    // Por defecto enfocamos la opción no destructiva.
    noBtn.focus();
  }

  /* ---------- Arranque ---------- */

  if (resetMount) {
    buildResetShell();
    showIdle(false);
  }
  renderStats();

  // Repintamos las estadísticas tras add() y reset().
  if (typeof Records.onChange === 'function') {
    Records.onChange(function () {
      renderStats();
    });
  }

  if (typeof Game !== 'undefined' && typeof Game.on === 'function') {
    Game.on('boot', function () {
      renderStats();
      clearNotice();
      showIdle(false);
    });
  }
})();
