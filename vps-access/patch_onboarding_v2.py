import pathlib, re

BASE = pathlib.Path("/opt/luna-ai-py/static")

# ---------- 1. CSS: аффордансы + bottom-sheet ----------
css = BASE / "css" / "luna.css"
s = css.read_text(encoding="utf-8")
if "card-breath" not in s:
    s += """

/* Аффордансы карт: дыхание рубашки, hover-lift, искра-подсказка */
@keyframes card-breath {
  0%, 100% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.25), inset 0 0 24px rgba(139, 92, 246, 0.08); }
  50% { box-shadow: 0 0 36px rgba(139, 92, 246, 0.55), inset 0 0 34px rgba(139, 92, 246, 0.18); }
}
.card-breath { animation: card-breath 3.4s ease-in-out infinite; }

.welcome-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: min(200px, 56vw);
  aspect-ratio: 3 / 5;
  margin: 14px auto 0;
  background:
    radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.45), transparent 60%),
    linear-gradient(160deg, #17111f, #0b0910);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 16px;
  color: var(--accent-soft);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.welcome-card__moon { font-size: 44px; }
.welcome-card__label { font-size: 14px; color: var(--silver); }

@media (hover: hover) and (pointer: fine) {
  .card-lift:hover {
    transform: translateY(-5px);
    border-color: var(--accent-soft);
    box-shadow: 0 0 32px rgba(139, 92, 246, 0.5);
  }
  .scheme-card:hover {
    border-color: rgba(139, 92, 246, 0.6) !important;
    box-shadow: 0 0 22px rgba(139, 92, 246, 0.35);
    transform: translateY(-2px);
  }
  .scheme-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
}

.luna-spark {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 12px;
  color: var(--accent-soft);
  background: rgba(13, 13, 20, 0.85);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 10px;
  padding: 3px 8px;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}
.luna-spark.is-visible { opacity: 1; animation: luna-shake 1.6s ease infinite; }

/* Bottom-sheet «Луна запомнит тебя 🌙» */
.luna-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 3, 6, 0.65);
  backdrop-filter: blur(3px);
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.luna-sheet {
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.08), rgba(13, 13, 20, 0.98));
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-bottom: none;
  border-radius: 20px 20px 0 0;
  padding: 22px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  overflow-y: auto;
  animation: sheet-up 0.3s cubic-bezier(0.2, 0.8, 0.3, 1);
}
@keyframes sheet-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
"""
    css.write_text(s, encoding="utf-8")
    print("css updated")

# ---------- 2. Бамп версии CSS во всех html ----------
for f in BASE.glob("*.html"):
    t = f.read_text(encoding="utf-8")
    t2 = re.sub(r"luna\.css\?v=\d+", "luna.css?v=3", t)
    if "luna.css?v=" not in t2 and "luna.css\"" in t2:
        t2 = t2.replace('luna.css"', 'luna.css?v=3"')
    if t2 != t:
        f.write_text(t2, encoding="utf-8")
        print("bumped", f.name)

# ---------- 3. today.html: гейты на ссылки + тап по камню ----------
p = BASE / "today.html"
s = p.read_text(encoding="utf-8")
s = s.replace('<script src="/static/js/tg.js"></script>',
              '<script src="/static/js/tg.js"></script>\n  <script src="/static/js/gate.js"></script>')
s = s.replace('<a href="/natal" class="inline-block mt-3 text-sm luna-accent no-underline">✨ Натальная карта →</a>',
              '<a href="/natal" data-gate="/natal" class="inline-block mt-3 text-sm luna-accent no-underline">✨ Натальная карта →</a>')
s = s.replace('<a href="/journal" class="inline-block mt-3 ml-4 text-sm luna-accent no-underline">📖 Дневник →</a>',
              '<a href="/journal" data-gate="/journal" class="inline-block mt-3 ml-4 text-sm luna-accent no-underline">📖 Дневник →</a>')
s = s.replace('<a href="/profile" class="inline-block mt-3 ml-4 text-sm luna-accent no-underline">👤 Профиль →</a>',
              '<a href="/profile" data-gate="/profile" class="inline-block mt-3 ml-4 text-sm luna-accent no-underline">👤 Профиль →</a>')
s = s.replace('<section class="luna-card">\n      <p class="text-xs tracking-widest uppercase luna-accent">Камень дня</p>',
              '<section class="luna-card" id="stone-card" style="cursor: pointer" title="Камень по знаку — нужна дата рождения">\n      <p class="text-xs tracking-widest uppercase luna-accent">Камень дня</p>')
s = s.replace("    loadMoon().catch(() => {});",
              """    document.querySelectorAll('[data-gate]').forEach(a => {
      a.addEventListener('click', (e) => { e.preventDefault(); lunaGateNavigate(a.dataset.gate); });
    });
    // Камень по знаку: гостю предлагаем сохранить дату, после — камень сразу по знаку
    document.getElementById('stone-card').addEventListener('click', () => {
      lunaRequestData(() => loadMoon());
    });

    loadMoon().catch(() => {});""")
p.write_text(s, encoding="utf-8")
print("today patched")

# ---------- 4. natal.html: предзаполнение даты из профиля ----------
p = BASE / "natal.html"
s = p.read_text(encoding="utf-8")
s = s.replace('<script src="/static/js/tg.js"></script>',
              '<script src="/static/js/tg.js"></script>\n  <script src="/static/js/gate.js"></script>')
s = s.replace("  </script>\n</body>",
              """    // дата уже сохранена через bottom-sheet — подставляем
    const saved = localStorage.getItem('luna_birth_date');
    if (saved && !document.getElementById('birth_date').value) {
      document.getElementById('birth_date').value = saved;
    }
  </script>
</body>""")
p.write_text(s, encoding="utf-8")
print("natal patched")

# ---------- 5. spreads.html: hover-свечение схем ----------
p = BASE / "spreads.html"
s = p.read_text(encoding="utf-8")
s = s.replace("el.className = 'w-full text-left luna-card !mb-0 !p-4 border transition';",
              "el.className = 'w-full text-left luna-card scheme-card !mb-0 !p-4 border';")
p.write_text(s, encoding="utf-8")
print("spreads patched")

# ---------- 6. profile.html: тон — в сессии, без сохранения ----------
p = BASE / "profile.html"
s = p.read_text(encoding="utf-8")
s = s.replace("b.addEventListener('click', () => { selectedTone = t; renderTones(); });",
              """b.addEventListener('click', () => {
          selectedTone = t;
          sessionStorage.setItem('luna_tone', t); // тон действует до конца сессии, профиль не трогаем
          const note = document.getElementById('tone-note');
          if (note) note.classList.remove('hidden');
          renderTones();
        });""")
s = s.replace('<div id="tones" class="grid grid-cols-2 gap-2"></div>',
              '<div id="tones" class="grid grid-cols-2 gap-2"></div>\n          <p id="tone-note" class="text-xs luna-accent mt-2 hidden">Тон применён до конца сессии 🌙</p>')
p.write_text(s, encoding="utf-8")
print("profile patched")
