// LUNA UI: хедер навигации, тост, share-шит, лог событий.
// Подключается после tg.js на всех страницах: <script src="/static/js/luna.js"></script>
(function () {
  const log = (type, payload) => {
    fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...window.lunaHeaders() },
      body: JSON.stringify({ type, payload: payload || {} }),
    }).catch(() => {});
  };
  window.lunaLog = log;

  // --- Хедер: логотип (→ /today), «←» (history.back, фолбэк /today), профиль ---
  function buildHeader() {
    const h = document.createElement('header');
    h.className = 'luna-header';
    h.innerHTML = `
      <button class="luna-header__btn" id="lh-back" aria-label="Назад">←</button>
      <a href="/today" class="luna-header__logo" aria-label="LUNA — на главную">
        <span class="luna-header__moon" aria-hidden="true">🌙</span> LUNA
      </a>
      <a href="/profile" class="luna-header__btn" aria-label="Профиль" title="Профиль">👤</a>`;
    document.body.prepend(h);
    document.getElementById('lh-back').addEventListener('click', () => {
      if (history.length > 1) history.back();
      else location.href = '/today';
    });
  }
  if (document.body) buildHeader(); else document.addEventListener('DOMContentLoaded', buildHeader);

  // --- Тост ---
  let toastTimer = null;
  window.lunaToast = function (text) {
    let t = document.getElementById('luna-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'luna-toast';
      t.className = 'luna-toast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 1800);
  };

  // --- Share-шит: копирование, Telegram, WhatsApp, VK; navigator.share — доп. строкой на мобильных ---
  window.lunaShare = function (title, text, url) {
    log('share_clicked', { channel: 'sheet_open' });
    let sheet = document.getElementById('luna-share');
    if (sheet) sheet.remove();
    const encoded = encodeURIComponent((text ? text + '\n\n' : '') + (url || location.origin));

    sheet = document.createElement('div');
    sheet.id = 'luna-share';
    sheet.className = 'luna-sheet';
    sheet.innerHTML = `
      <div class="luna-sheet__backdrop"></div>
      <div class="luna-sheet__panel" role="dialog" aria-label="Поделиться">
        <p class="luna-title text-sm mb-3">${title || 'Поделиться 🌙'}</p>
        <button class="luna-btn w-full mt-2" data-channel="copy">📋 Скопировать текст+ссылку</button>
        <a class="luna-btn luna-btn--ghost w-full mt-2 no-underline" target="_blank" rel="noopener"
           href="https://t.me/share/url?url=${encodeURIComponent(url || location.origin)}&text=${encodeURIComponent(text || '')}"
           data-channel="telegram">✈️ Telegram</a>
        <a class="luna-btn luna-btn--ghost w-full mt-2 no-underline" target="_blank" rel="noopener"
           href="https://wa.me/?text=${encoded}"
           data-channel="whatsapp">💬 WhatsApp</a>
        <a class="luna-btn luna-btn--ghost w-full mt-2 no-underline" target="_blank" rel="noopener"
           href="https://vk.com/share.php?url=${encodeURIComponent(url || location.origin)}&title=${encodeURIComponent(title || 'LUNA AI')}&description=${encodeURIComponent(text || '')}"
           data-channel="vk">🅥 VK</a>
        ${navigator.share ? '<button class="luna-btn luna-btn--ghost w-full mt-2" data-channel="native">📶 Ещё способы…</button>' : ''}
        <button class="luna-btn luna-btn--ghost w-full mt-2" data-channel="close">Закрыть</button>
      </div>`;
    document.body.appendChild(sheet);

    const close = () => sheet.remove();
    sheet.querySelector('.luna-sheet__backdrop').addEventListener('click', close);

    const copyAll = async () => {
      const full = (text ? text + '\n\n' : '') + (url || location.origin);
      try {
        await navigator.clipboard.writeText(full);
        window.lunaToast('Скопировано 🌙');
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = full;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        window.lunaToast('Скопировано 🌙');
      }
    };

    sheet.addEventListener('click', (e) => {
      const el = e.target.closest('[data-channel]');
      if (!el) return;
      const ch = el.dataset.channel;
      log('share_clicked', { channel: ch });
      if (ch === 'copy') { copyAll(); close(); }
      else if (ch === 'close') close();
      else if (ch === 'native') { navigator.share({ title: title || 'LUNA AI', text, url: url || location.origin }).catch(() => {}); close(); }
      // ссылки (telegram/whatsapp/vk) открываются сами; шит оставляем до возврата
      else setTimeout(close, 400);
    });
  };
})();
