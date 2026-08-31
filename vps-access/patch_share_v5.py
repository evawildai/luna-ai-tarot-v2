import pathlib, re

BASE = pathlib.Path("/opt/luna-ai-py/static")

# ---------- 1. api.py: share_clicked в белом списке ----------
p = pathlib.Path("/opt/luna-ai-py/routers/api.py")
s = p.read_text(encoding="utf-8")
s = s.replace('allowed = {"welcome_shown", "data_prompt_shown", "data_saved"}',
              'allowed = {"welcome_shown", "data_prompt_shown", "data_saved", "share_clicked"}')
p.write_text(s, encoding="utf-8")
print("api whitelist + share_clicked")

# ---------- 2. today.html: кнопке data-share, старый обработчик убрать ----------
p = BASE / "today.html"
s = p.read_text(encoding="utf-8")
s = s.replace('<button id="share-btn" class="luna-btn luna-btn--ghost w-full mt-2" disabled>Поделиться</button>',
              '<button id="share-btn" data-share="daily" class="luna-btn luna-btn--ghost w-full mt-2" disabled>Поделиться</button>')
# убрать старый прямой обработчик (от shareBtn.addEventListener до конца блока)
i = s.index("    shareBtn.addEventListener('click', async () => {")
j = s.index("    });", i) + len("    });")
old_block = s[i:j]
assert "navigator.share" in old_block
s = s[:i] + """    // Текст шита — из текущей раскрытой карты (имя + значение + ссылка)
    window.LunaShareText = window.LunaShareText || {};
    window.LunaShareText.daily = () => {
      const name = (lastCard && (lastCard.title || lastCard.nameRu)) || 'Карта дня';
      const quote = document.getElementById('ai-day-message').textContent
        || document.getElementById('card-meaning').textContent || '';
      window.LunaShare.setText('daily', '✦ Моя карта дня в LUNA AI: ' + name + ' ☾\\n\\n«' + quote + '»');
    };
""" + s[j:]
# подключить share.js после gate.js
if "share.js" not in s:
    s = s.replace('<script src="/static/js/gate.js?v=1"></script>',
                  '<script src="/static/js/gate.js?v=1"></script>\n  <script src="/static/js/share.js?v=5"></script>')
# бамп css
s = s.replace("luna.css?v=6", "luna.css?v=7")
p.write_text(s, encoding="utf-8")
print("today share delegated")

# ---------- 3. spreads.html: кнопка «Поделиться» в результате ----------
p = BASE / "spreads.html"
s = p.read_text(encoding="utf-8")
if "data-share" not in s:
    # добавить кнопку в секцию результата (появляется после рендера)
    s = s.replace('<section id="result" class="hidden"></section>',
                  '''<section id="result" class="hidden">
        <button class="luna-btn luna-btn--ghost w-full mt-4" data-share="spread">Поделиться</button>
      </section>''')
    # при рендере результата — заполнить текст шита
    s = s.replace("        box.innerHTML = html;",
                  """        window.LunaShareText = window.LunaShareText || {};
        window.LunaShareText.spread = () => {
          const title = spread ? spread.title : 'Расклад';
          window.LunaShare.setText('spread', '✦ Расклад «' + title + '» в LUNA AI ☾');
        };
        document.getElementById('result').classList.remove('hidden');
        box.innerHTML = html;""")
    s = s.replace('<script src="/static/js/tg.js"></script>',
                  '<script src="/static/js/tg.js"></script>\n  <script src="/static/js/share.js?v=5"></script>')
s = s.replace("luna.css?v=6", "luna.css?v=7")
p.write_text(s, encoding="utf-8")
print("spreads share added")

# ---------- 4. остальные страницы: bump css, share.js не нужен там, где нет кнопки ----------
for f in BASE.glob("*.html"):
    t = f.read_text(encoding="utf-8")
    t2 = t.replace("luna.css?v=6", "luna.css?v=7")
    if t2 != t:
        f.write_text(t2, encoding="utf-8")
print("css v7 bumped")

# ---------- 5. CSS: тост ----------
p = BASE / "css/luna.css"
s = p.read_text(encoding="utf-8")
if ".luna-toast" not in s:
    s += """

/* Тост share-шита */
.luna-toast {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%) translateY(10px);
  background: #14101d;
  border: 1px solid rgba(139, 92, 246, 0.5);
  color: #D6D5E0;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 12px;
  box-shadow: 0 0 24px rgba(139, 92, 246, 0.35);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 80;
}
.luna-toast.is-visible { opacity: 1; transform: translateX(-50%) translateY(0); }
"""
    p.write_text(s, encoding="utf-8")
print("toast css added")
