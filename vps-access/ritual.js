// Ритуал карты LUNA v3: колода с выбором.
// idle (кнопка «Тянуть карту») → spread (веер из 5 рубашек, /api/draw выполнен)
// → revealed (только по тапу на рубашку: flip выбранной + затухание остальных).
// Абсолютное правило: переходы вперёд ТОЛЬКО по явному действию пользователя.
// Таймеры — только для анимаций; автопереходов нет.
(function () {
  function createRitual(opts) {
    const { fanBox, drawBtn, getDeck, onDrawn, onReset } = opts;
    const interpretBox = opts.interpretBox || null;
    const aiBox = opts.aiBox || null;
    const shareBtn = opts.shareBtn || null;

    // state: 'idle' | 'spread' | 'revealed'
    let state = 'idle';
    let drawing = false;
    let lastCard = null;

    function setUI(revealed) {
      if (revealed) {
        drawBtn.textContent = 'Тянуть другую карту';
        if (shareBtn) shareBtn.disabled = false;
      } else {
        drawBtn.textContent = 'Тянуть карту';
        if (shareBtn) shareBtn.disabled = true;
      }
    }

    function hideMeta() {
      if (interpretBox) interpretBox.classList.add('hidden');
      if (aiBox) aiBox.classList.add('hidden');
    }

    function resetToIdle() {
      state = 'idle';
      drawing = false;
      lastCard = null;
      fanBox.innerHTML = '';
      fanBox.classList.remove('is-open');
      setUI(false);
      hideMeta();
      if (onReset) onReset();
    }

    // idle → spread: одна явная кнопка; /api/draw выполняется на входе в spread
    async function spread() {
      if (drawing) return;
      drawing = true;
      drawBtn.disabled = true;
      hideMeta();
      try {
        const res = await fetch('/api/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...window.lunaHeaders() },
          body: JSON.stringify({ deck: getDeck() }),
        });
        if (!res.ok) throw new Error('draw failed');
        lastCard = await res.json();

        fanBox.innerHTML = '';
        fanBox.classList.add('is-open');
        for (let i = 0; i < 5; i++) {
          const card = document.createElement('button');
          card.type = 'button';
          card.className = 'fan-card';
          card.style.setProperty('--fan-i', i);
          card.setAttribute('aria-label', 'Карта ' + (i + 1));
          card.innerHTML =
            '<span class="fan-card__inner">' +
            '<span class="fan-card__face fan-card__back"><span class="luna-ico luna-ico--lg" data-ico="moon"></span></span>' +
            '<span class="fan-card__face fan-card__front">' +
            '<span class="luna-title" style="font-size:13px">' + (lastCard.title || lastCard.nameRu || '') + '</span>' +
            '<span class="text-[10px] luna-accent mt-1">' + (lastCard.reversed ? '↺ перев.' : '') + '</span>' +
            '</span></span>';
          card.addEventListener('click', () => reveal(card));
          fanBox.appendChild(card);
        }
        state = 'spread'; // ждём тапа по рубашке; никаких таймеров-переходов
      } catch (ex) {
        resetToIdle();
      }
      drawBtn.disabled = false;
      drawing = false;
    }

    // spread → revealed: ТОЛЬКО тап по рубашке
    function reveal(cardEl) {
      if (state !== 'spread') return;
      cardEl.classList.add('is-flipped');
      fanBox.querySelectorAll('.fan-card').forEach(c => {
        if (c !== cardEl) c.classList.add('is-faded');
      });
      state = 'revealed';
      setUI(true);
      if (onDrawn) onDrawn(lastCard);
    }

    // Явное действие по кнопке: idle → spread; revealed → в idle (ждём нового клика)
    function onButtonAction() {
      if (state === 'idle') spread();
      else if (state === 'revealed') resetToIdle();
      // в spread кнопка disabled — тап по рубашке
    }

    return { onButtonAction, resetToIdle, get state() { return state; } };
  }

  // Welcome-карта на /: явный клик — переход на /today.
  function openOnCardClick(el, url) {
    el.addEventListener('click', () => {
      if (window.LUNA_TG && window.LUNA_TG.HapticFeedback) {
        window.LUNA_TG.HapticFeedback.impactOccurred('light');
      }
      location.href = url;
    });
  }

  window.LunaRitual = { openOnCardClick, createRitual };
})();
