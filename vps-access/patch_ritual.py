import pathlib

p = pathlib.Path("/opt/luna-ai-py/static/today.html")
s = p.read_text(encoding="utf-8")

start_marker = "    let currentDeck = 'tarot';"
end_marker = "document.querySelectorAll('[data-ico]')"
i = s.index(start_marker)
j = s.index(end_marker)

new_block = """    let currentDeck = 'tarot';
    let lastCard = null;

    async function loadMoon() {
      const bd = localStorage.getItem('luna_birth_date') || '';
      const res = await fetch('/api/moon' + (bd ? '?birth_date=' + bd : ''));
      const m = await res.json();
      // Фаза Луны — SVG-круг с маской по реальным данным /api/moon
      document.getElementById('moon-title').innerHTML =
        '<span class="luna-ico luna-ico--lg">' + window.lunaMoonSVG(m.illumination, (m.lunar_day || 1) <= 15) + '</span> ' + m.phase;
      document.getElementById('lunar-day').textContent = m.lunar_day + '-й';
      document.getElementById('illumination').textContent = m.illumination + '%';
      if (m.birthstone && m.birthstone.stone) {
        document.getElementById('stone-name').textContent = m.birthstone.stone;
        document.getElementById('stone-sign').textContent = m.birthstone.symbol + ' ' + m.birthstone.sign + ' ·';
        document.getElementById('stone-meaning').textContent = m.birthstone.meaning;
      }
    }

    const wrap = document.getElementById('card-wrap');
    const drawBtn = document.getElementById('draw-btn');
    const interp = document.getElementById('card-interpretation');
    const aiBox = document.getElementById('ai-interpretation');
    const shareBtn = document.getElementById('share-btn');

    const ritual = window.LunaRitual.createRitual({
      cardWrap: wrap,
      drawBtn: drawBtn,
      shareBtn: shareBtn,
      interpretBox: interp,
      aiBox: aiBox,
      getDeck: () => currentDeck,
      onDrawn: (card) => {
        lastCard = card;
        document.getElementById('card-name').textContent = card.title || card.nameRu;
        document.getElementById('card-keywords').textContent = (card.keywords || []).join(' · ');
        document.getElementById('card-reversed').textContent = card.reversed ? '↺ Перевёрнутая' : '';
        const meaning = card.reversed && card.meaningReversed ? card.meaningReversed : (card.meaningUpright || card.metaphor);
        document.getElementById('card-meaning').textContent = meaning;
        document.getElementById('card-question').textContent = card.coachingQuestion || (card.guidingQuestions || [])[0] || '—';
        interp.classList.remove('hidden');
        loadDailyCardAI();
      },
      onReset: () => { lastCard = null; },
    });

    // Раскрытие ТОЛЬКО по явному клику: по карте или по кнопке
    wrap.addEventListener('click', ritual.onUserAction);
    drawBtn.addEventListener('click', ritual.onUserAction);

    // Тумблер Таро/МАК: сбрасывает в рубашку и НЕ запускает вытягивание
    document.querySelectorAll('.deck-btn').forEach(btn => btn.addEventListener('click', () => {
      if (currentDeck === btn.dataset.deck) return;
      currentDeck = btn.dataset.deck;
      document.querySelectorAll('.deck-btn').forEach(b =>
        b.setAttribute('aria-pressed', String(b === btn)));
      ritual.resetToBack();
    }));

    async function loadDailyCardAI() {
      const el = aiBox;
      try {
        const res = await fetch('/api/daily-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...window.lunaHeaders() },
          body: JSON.stringify({ deck: currentDeck, card_id: lastCard.id, reversed_: !!lastCard.reversed }),
        });
        const body = await res.json();
        const a = body.ai;
        if (!a) return; // локальный режим без AI — показываем только базовые значения
        document.getElementById('ai-day-message').textContent = a.dayMessage || '';
        document.getElementById('ai-energy').textContent = a.energyOfTheDay || '';
        document.getElementById('ai-opportunity').textContent = a.opportunity || '';
        document.getElementById('ai-warning').textContent = a.warning || '';
        document.getElementById('ai-affirmation').textContent = a.affirmation ? '«' + a.affirmation + '»' : '';
        el.classList.remove('hidden');
      } catch (ex) { /* AI недоступен — остаёмся на локальной трактовке */ }
    }

    shareBtn.addEventListener('click', async () => {
      if (!lastCard) return;
      if (window.LUNA_TG && window.LUNA_TG.HapticFeedback) {
        window.LUNA_TG.HapticFeedback.impactOccurred('light');
      }
      const name = lastCard.title || lastCard.nameRu || '';
      const quote = document.getElementById('ai-day-message').textContent
        || (lastCard.reversed && lastCard.meaningReversed ? lastCard.meaningReversed : (lastCard.meaningUpright || lastCard.metaphor || ''));
      const text = '✦ Моя карта дня в LUNA AI: ' + name + ' ☾\\n\\n«' + quote + '»\\n\\n' + location.origin;
      const okMsg = () => {
        shareBtn.textContent = 'Скопировано ✓';
        setTimeout(() => { shareBtn.textContent = 'Поделиться'; }, 1500);
      };
      // Нативный шаринг (Telegram/мобильные браузеры), иначе буфер обмена.
      if (navigator.share) {
        try { await navigator.share({ title: 'LUNA AI — карта дня', text }); return; }
        catch (e) { /* пользователь отменил */ return; }
      }
      try {
        await navigator.clipboard.writeText(text);
        okMsg();
      } catch (e) { /* буфер недоступен */ }
    });

    """
s = s[:i] + new_block + s[j:]

# подключаем ritual.js до inline-скрипта
if "ritual.js" not in s:
    s = s.replace('<script src="/static/js/luna_icons.js?v=1"></script>',
                  '<script src="/static/js/luna_icons.js?v=1"></script>\n  <script src="/static/js/ritual.js?v=1"></script>')

p.write_text(s, encoding="utf-8")

# контроль: в today.html не должно остаться таймеров, добавляющих is-flipped
import re
adds = [m.start() for m in re.finditer(r"classList\.add\('is-flipped'\)", s)]
print("is-flipped adds in today.html:", len(adds))  # ожидаем 0 — вся логика в ritual.js

# ---------- index.html: ritual.js для welcome-карты ----------
p = pathlib.Path("/opt/luna-ai-py/static/index.html")
s = p.read_text(encoding="utf-8")
if "ritual.js" not in s:
    s = s.replace('<script src="/static/js/luna_icons.js?v=1"></script>',
                  '<script src="/static/js/luna_icons.js?v=1"></script>\n  <script src="/static/js/ritual.js?v=1"></script>')
old_handler = """    document.getElementById('open-card').addEventListener('click', () => {
      if (window.LUNA_TG && window.LUNA_TG.HapticFeedback) {
        window.LUNA_TG.HapticFeedback.impactOccurred('light');
      }
      location.href = '/today';
    });"""
new_handler = """    // переход — только по явному клику (LunaRitual)
    window.LunaRitual.openOnCardClick(document.getElementById('open-card'), '/today');"""
assert old_handler in s, "index handler not found"
s = s.replace(old_handler, new_handler)
p.write_text(s, encoding="utf-8")
print("index patched")
