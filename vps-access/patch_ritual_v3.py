import pathlib

p = pathlib.Path("/opt/luna-ai-py/static/today.html")
s = p.read_text(encoding="utf-8")

# 1. разметка: вместо одиночной карты — контейнер веера
old_html = """      <div class="drawn-card" id="card-wrap" style="display: none;">
        <div class="drawn-card__inner">
          <div class="drawn-card__face drawn-card__back"><span class="luna-ico" data-ico="moon"></span></div>
          <div class="drawn-card__face drawn-card__front">
            <p class="luna-title text-base" id="card-name"></p>
            <p class="text-xs luna-accent mt-1" id="card-keywords"></p>
            <p class="text-[11px] text-[#8a8a9a] mt-2" id="card-reversed"></p>
          </div>
        </div>
      </div>"""
new_html = """      <div class="card-fan" id="card-fan" aria-live="polite"></div>"""
assert old_html in s, "card-wrap block not found"
s = s.replace(old_html, new_html)

# 2. скрипт: привязка к вееру
s = s.replace("const wrap = document.getElementById('card-wrap');",
              "const fanBox = document.getElementById('card-fan');")
old_ritual = """    const ritual = window.LunaRitual.createRitual({
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
    drawBtn.addEventListener('click', ritual.onUserAction);"""
new_ritual = """    const ritual = window.LunaRitual.createRitual({
      fanBox: fanBox,
      drawBtn: drawBtn,
      shareBtn: shareBtn,
      interpretBox: interp,
      aiBox: aiBox,
      getDeck: () => currentDeck,
      onDrawn: (card) => {
        lastCard = card;
        const meaning = card.reversed && card.meaningReversed ? card.meaningReversed : (card.meaningUpright || card.metaphor);
        document.getElementById('card-meaning').textContent = meaning;
        document.getElementById('card-question').textContent = card.coachingQuestion || (card.guidingQuestions || [])[0] || '—';
        interp.classList.remove('hidden');
        loadDailyCardAI();
      },
      onReset: () => { lastCard = null; },
    });

    // spread → revealed ТОЛЬКО по тапу на рубашку; кнопка — idle→spread / revealed→idle
    drawBtn.addEventListener('click', ritual.onButtonAction);"""
assert old_ritual in s, "ritual wiring not found"
s = s.replace(old_ritual, new_ritual)

# 3. версии
s = s.replace("ritual.js?v=1", "ritual.js?v=3")
s = s.replace("luna.css?v=5", "luna.css?v=6")
p.write_text(s, encoding="utf-8")
print("today.html v3 wired")

# 4. index.html: bump версий
p = pathlib.Path("/opt/luna-ai-py/static/index.html")
s = p.read_text(encoding="utf-8")
s = s.replace("ritual.js?v=1", "ritual.js?v=3").replace("luna.css?v=5", "luna.css?v=6")
p.write_text(s, encoding="utf-8")
print("index bumped")

# 5. CSS веера
p = pathlib.Path("/opt/luna-ai-py/static/css/luna.css")
s = p.read_text(encoding="utf-8")
if ".card-fan" not in s:
    s += """

/* Ритуал v3: веер из 5 рубашек (десктоп — по центру, мобайл — внахлёст) */
.card-fan {
  display: none;
  justify-content: center;
  align-items: center;
  min-height: 190px;
  margin: 12px auto 0;
}
.card-fan.is-open { display: flex; }
.fan-card {
  position: relative;
  width: 96px;
  aspect-ratio: 3 / 5;
  flex: 0 0 auto;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  perspective: 700px;
  transform: rotate(calc((var(--fan-i) - 2) * 5deg))
             translateY(calc(-1 * (2 - abs(var(--fan-i) - 2)) * 0px));
  transition: transform 0.25s ease, opacity 0.35s ease, filter 0.35s ease;
  animation: fan-in 0.45s ease backwards;
  animation-delay: calc(var(--fan-i) * 70ms);
}
@keyframes fan-in {
  from { transform: translateY(14px) rotate(0deg); opacity: 0; }
}
.fan-card:nth-child(1) { transform: rotate(-10deg) translateX(14px); }
.fan-card:nth-child(2) { transform: rotate(-5deg) translateX(5px); }
.fan-card:nth-child(4) { transform: rotate(5deg) translateX(-5px); }
.fan-card:nth-child(5) { transform: rotate(10deg) translateX(-14px); }
.fan-card__inner {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1);
}
.fan-card.is-flipped .fan-card__inner { transform: rotateY(180deg); }
.fan-card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px;
}
.fan-card__back {
  background:
    radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.45), transparent 60%),
    linear-gradient(160deg, #17111f, #0b0910);
  border: 1px solid rgba(139, 92, 246, 0.5);
}
.fan-card__front {
  transform: rotateY(180deg);
  background: linear-gradient(170deg, rgba(139, 92, 246, 0.22), #0d0b14 70%);
  border: 1px solid rgba(139, 92, 246, 0.45);
  box-shadow: var(--glow);
}
.fan-card.is-faded { opacity: 0.22; filter: saturate(0.4); pointer-events: none; }
@media (hover: hover) and (pointer: fine) {
  .fan-card:not(.is-faded):hover { transform: translateY(-6px) scale(1.03); z-index: 2; }
}
/* мобайл: веер внахлёст */
@media (max-width: 480px) {
  .card-fan { min-height: 170px; }
  .fan-card { width: 84px; }
  .fan-card:nth-child(n+3) { margin-left: -26px; }
  .fan-card:nth-child(1) { transform: rotate(-12deg); }
  .fan-card:nth-child(2) { transform: rotate(-6deg); }
  .fan-card:nth-child(4) { transform: rotate(6deg); }
  .fan-card:nth-child(5) { transform: rotate(12deg); }
}
"""
    p.write_text(s, encoding="utf-8")
print("css fan added")
