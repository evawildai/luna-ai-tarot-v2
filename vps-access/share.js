// Share v5: единый шит «Копировать / Telegram / WhatsApp / VK».
// Делегирование кликов по [data-share] — работает и на кнопках, созданных
// динамически после reveal. Текст шита — из текущей раскрытой карты/расклада.
(function () {
  const LINK = 'https://lunalis.ru';

  let currentText = '';
  let currentSource = '';

  function ensureSheet() {
    let overlay = document.getElementById('luna-share-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'luna-share-overlay';
    overlay.className = 'luna-sheet-overlay';
    overlay.style.zIndex = '70'; // выше ритуала и data-sheet
    overlay.innerHTML = `
      <div class="luna-sheet" role="dialog" aria-modal="true" aria-label="Поделиться">
        <p class="text-xs tracking-widest uppercase luna-accent">Поделиться ☾</p>
        <p class="text-sm text-[#8a8a9a] mt-1" id="share-preview"></p>
        <div class="space-y-2 mt-4">
          <button class="luna-btn w-full" id="share-copy" data-share-action="copy">Копировать</button>
          <a class="luna-btn luna-btn--ghost w-full no-underline" id="share-tg" data-share-action="telegram"
             target="_blank" rel="noopener">Telegram</a>
          <a class="luna-btn luna-btn--ghost w-full no-underline" id="share-wa" data-share-action="whatsapp"
             target="_blank" rel="noopener">WhatsApp</a>
          <a class="luna-btn luna-btn--ghost w-full no-underline" id="share-vk" data-share-action="vk"
             target="_blank" rel="noopener">VK</a>
        </div>
        <button class="luna-btn luna-btn--ghost w-full mt-2" id="share-close">Закрыть</button>
      </div>
      <div id="luna-toast" class="luna-toast">Скопировано ☾</div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#share-close').addEventListener('click', () => close());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#share-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(currentText);
      } catch (e) {
        // фолбэк для старых вебвью
        const ta = document.createElement('textarea');
        ta.value = currentText;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e2) {}
        ta.remove();
      }
      window.lunaLogEvent && window.lunaLogEvent('share_clicked',
        JSON.stringify({ source: currentSource, action: 'copy' }));
      const toast = overlay.querySelector('#luna-toast');
      toast.classList.add('is-visible');
      setTimeout(() => toast.classList.remove('is-visible'), 1800); // анимация тоста
    });

    return overlay;
  }

  function close() {
    const o = document.getElementById('luna-share-overlay');
    if (o) o.remove();
  }

  function toast(text) {
    const o = ensureSheet();
    const t = o.querySelector('#luna-toast');
    t.textContent = text;
    t.classList.add('is-visible');
    setTimeout(() => t.classList.remove('is-visible'), 1800);
  }

  window.LunaShare = {
    /** Задать текст шита из текущего контекста (раскрытая карта / расклад). */
    setText(source, text) {
      currentSource = source;
      currentText = text + '\n\n' + LINK;
    },
    open() {
      const o = ensureSheet();
      o.querySelector('#share-preview').textContent =
        currentText.length > 140 ? currentText.slice(0, 140) + '…' : currentText;
      const enc = encodeURIComponent;
      const link = LINK;
      o.querySelector('#share-tg').href =
        'https://t.me/share/url?url=' + enc(link) + '&text=' + enc(currentText.replace(link, ''));
      o.querySelector('#share-wa').href = 'https://wa.me/?text=' + enc(currentText);
      o.querySelector('#share-vk').href =
        'https://vk.com/share.php?url=' + enc(link) + '&title=' + enc(currentText.slice(0, 120));
      o.classList.add('is-open');
    },
  };

  // Делегирование: клики по любым [data-share] — включая созданные после reveal.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-share]');
    if (!btn) return;
    e.preventDefault();
    const source = btn.getAttribute('data-share') || 'unknown';
    const prepare = window.LunaShareText && window.LunaShareText[source];
    if (prepare) prepare(); // страница сама заполняет текст через LunaShare.setText
    window.lunaLogEvent && window.lunaLogEvent('share_clicked',
      JSON.stringify({ source, action: 'open' }));
    window.LunaShare.open();
  });
})();
