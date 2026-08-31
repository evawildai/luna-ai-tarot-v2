// LUNA AI: гейт данных + bottom-sheet «Луна запомнит тебя 🌙».
// Гость бесплатно пользуется картой дня, раскладами, МАК и share.
// Данные (согласие + дата) собираем ТОЛЬКО при входе в персональные разделы:
// наталка, дневник, профиль, камень по знаку.
(function () {
  window.lunaLogEvent = function (type, payload) {
    try {
      fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...window.lunaHeaders() },
        body: JSON.stringify({ type, payload: payload || null }),
      }).catch(() => {});
    } catch (e) { /* события не блокируют UI */ }
  };

  window.lunaHasBirthData = function () {
    return !!localStorage.getItem('luna_birth_date');
  };

  let sheetEl = null;

  function buildSheet(then) {
    const overlay = document.createElement('div');
    overlay.className = 'luna-sheet-overlay';
    overlay.innerHTML = `
      <div class="luna-sheet" role="dialog" aria-modal="true" aria-label="Луна запомнит тебя">
        <p class="text-xs tracking-widest uppercase luna-accent">Луна запомнит тебя 🌙</p>
        <p class="text-sm text-[#8a8a9a] mt-1">Нужно для натальной карты, дневника и профиля. Всё остальное — бесплатно и без данных.</p>
        <label class="flex items-start gap-3 text-sm cursor-pointer mt-4">
          <input type="checkbox" id="sheet-consent" class="luna-consent mt-0.5 accent-violet-500" />
          <span>Я даю согласие на обработку персональных данных и принимаю
            <a href="/policy" target="_blank" class="underline">политику конфиденциальности</a>.</span>
        </label>
        <p id="sheet-consent-error" class="luna-field-error">Нужно твоё согласие, чтобы Луна сохранила данные 🌙</p>
        <div class="mt-3">
          <label class="block text-xs text-[#8a8a9a] mb-1" for="sheet-birth-date">Дата рождения *</label>
          <input class="luna-input" type="date" id="sheet-birth-date" />
          <p id="sheet-date-error" class="luna-field-error">Укажи дату рождения — без неё не посчитаю карту</p>
        </div>
        <details class="mt-3">
          <summary class="text-xs text-[#8a8a9a] cursor-pointer">Время и город — необязательно</summary>
          <div class="mt-2 space-y-3">
            <div>
              <label class="block text-xs text-[#8a8a9a] mb-1" for="sheet-birth-time">Время рождения</label>
              <input class="luna-input" type="time" id="sheet-birth-time" />
            </div>
            <div>
              <label class="block text-xs text-[#8a8a9a] mb-1" for="sheet-city">Город</label>
              <input class="luna-input" type="text" id="sheet-city" placeholder="Москва" />
            </div>
          </div>
        </details>
        <button id="sheet-save" class="luna-btn w-full mt-4">Сохранить и продолжить ✨</button>
        <button id="sheet-cancel" class="luna-btn luna-btn--ghost w-full mt-2">Позже</button>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  window.lunaOpenDataSheet = function (then) {
    window.lunaLogEvent('data_prompt_shown');
    const overlay = buildSheet(then);
    sheetEl = overlay;

    function showErr(id, el) {
      const msg = overlay.querySelector('#' + id + '-error');
      msg.classList.add('is-visible');
      if (el) {
        el.classList.add('is-invalid');
        el.classList.remove('luna-shake');
        void el.offsetWidth;
        el.classList.add('luna-shake');
      }
    }
    function clearErrs() {
      overlay.querySelectorAll('.luna-field-error').forEach(m => m.classList.remove('is-visible'));
      overlay.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }

    overlay.querySelector('#sheet-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#sheet-save').addEventListener('click', async () => {
      clearErrs();
      const consent = overlay.querySelector('#sheet-consent');
      const dateInput = overlay.querySelector('#sheet-birth-date');
      if (!consent.checked) { showErr('sheet-consent', consent); return; }
      if (!dateInput.value) { showErr('sheet-date', dateInput); dateInput.focus(); return; }
      const btn = overlay.querySelector('#sheet-save');
      btn.disabled = true;
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...window.lunaHeaders() },
          body: JSON.stringify({
            birth_date: dateInput.value || null,
            birth_time: overlay.querySelector('#sheet-birth-time').value || null,
            city: overlay.querySelector('#sheet-city').value || null,
            tone: sessionStorage.getItem('luna_tone') || 'мягко',
            consent: consent.checked,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка сохранения');
        localStorage.setItem('luna_birth_date', dateInput.value);
        window.lunaLogEvent('data_saved');
        overlay.remove();
        sheetEl = null;
        if (then) then();
      } catch (ex) {
        btn.disabled = false;
        const msg = overlay.querySelector('#sheet-date-error');
        msg.textContent = ex.message;
        msg.classList.add('is-visible');
      }
    });
  };

  // Гейт: если данные есть — сразу продолжаем, иначе sheet → продолжаем.
  window.lunaRequestData = function (then) {
    if (window.lunaHasBirthData()) { then(); return; }
    window.lunaOpenDataSheet(then);
  };

  window.lunaGateNavigate = function (url) {
    window.lunaRequestData(() => { location.href = url; });
  };
})();
