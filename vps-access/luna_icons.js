// LUNA brand icons: inline SVG, серебряный штрих #D6D5E0 + фиолетовое свечение.
// Стиль неон-линий; вертикальное выравнивание как у emoji (middle).
(function () {
  const GLOW = 'class="luna-svg" aria-hidden="true"';
  const svg = (inner, vb) =>
    `<svg ${GLOW} viewBox="${vb || '0 0 24 24'}" fill="none" stroke="currentColor" ` +
    `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  const icons = {
    // Полумесяц
    moon: svg('<path d="M17.5 13.5A7.5 7.5 0 0 1 8.2 4.2a7.5 7.5 0 1 0 9.3 9.3Z" fill="currentColor" stroke="none" opacity="0.9"/>'),
    // Четырёхлучевая искра
    spark: svg('<path d="M12 3.5c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7Z" fill="currentColor" stroke="none" opacity="0.9"/>'),
    // МАК: зеркало-овоид с оком
    mirror: svg('<ellipse cx="12" cy="12" rx="6.5" ry="9"/><ellipse cx="12" cy="12" rx="2.6" ry="3.6"/><circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none"/>'),
    // Книга
    book: svg('<path d="M4 5.5C6 4.4 8.5 4.4 12 6c3.5-1.6 6-1.6 8-.5V18c-2-1.1-4.5-1.1-8 .5-3.5-1.6-6-1.6-8-.5Z"/><path d="M12 6v12.5"/>'),
    // Силуэт
    person: svg('<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.5c1.2-3.6 3.6-5.3 6.5-5.3s5.3 1.7 6.5 5.3"/>'),
    // Карта
    card: svg('<rect x="6.5" y="3.5" width="11" height="17" rx="2"/><path d="M9.5 8.5c1-.6 2-.6 2.5.4.5-1 1.5-1 2.5-.4"/><path d="M9.5 14.5h5"/>'),
    // Кристалл
    crystal: svg('<path d="M12 3.5 17 9l-5 11.5L7 9Z"/><path d="M7 9h10M12 3.5 9.8 9l2.2 11.5L14.2 9Z"/>'),
  };

  window.lunaIcon = function (name) {
    return icons[name] || '';
  };

  // Автозаполнение статических вставок <span data-ico="имя"></span>
  function fill() {
    document.querySelectorAll('[data-ico]').forEach(el => {
      el.innerHTML = icons[el.dataset.ico] || '';
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fill);
  } else {
    fill();
  }

  // Фаза Луны: круг с маской по реальной освещённости.
  // illum — % освещённости (0..100), waxing — растёт ли Луна.
  window.lunaMoonSVG = function (illum, waxing) {
    illum = Math.max(0, Math.min(100, Number(illum) || 0));
    const lit = 'currentColor';
    const dark = 'rgba(214, 213, 224, 0.18)';
    // x-координата терминатора: смещение эллипса тени
    const k = (50 - illum) / 50;           // 0..2
    const rx = Math.abs(9 * Math.cos((illum / 100) * Math.PI));
    const darkSideFirst = illum <= 50;
    // Собираем из двух половинок + эллипс терминатора
    const leftLit = waxing ? illum <= 50 : illum > 50; // растущая освещена справа
    const base = waxing
      ? `<path d="M12 3a9 9 0 0 1 0 18Z" fill="${lit}" stroke="none"/>
         <path d="M12 3a9 9 0 0 0 0 18Z" fill="${dark}" stroke="none"/>`
      : `<path d="M12 3a9 9 0 0 0 0 18Z" fill="${lit}" stroke="none"/>
         <path d="M12 3a9 9 0 0 1 0 18Z" fill="${dark}" stroke="none"/>`;
    // терминатор: эллипс, закрашивающий переходную область
    const term = `<ellipse cx="12" cy="12" rx="${rx.toFixed(2)}" ry="9"
        fill="${illum > 50 ? lit : dark}" stroke="none"/>`;
    const rim = '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1" opacity="0.55" fill="none"/>';
    return `<svg ${GLOW} viewBox="0 0 24 24" fill="none">${base}${term}${rim}</svg>`;
  };
})();
