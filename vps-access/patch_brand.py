"""Бренд-чистка: emoji → SVG (web, через data-ico) / глифы (бот). Серебро + фиолет."""
import pathlib

BASE = pathlib.Path("/opt/luna-ai-py")

def sub_all(path, pairs):
    p = pathlib.Path(path)
    s = p.read_text(encoding="utf-8")
    for old, new in pairs:
        if old not in s:
            print(f"  !! NOT FOUND in {p.name}: {old[:70]!r}")
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8")
    print("patched", p.name)

def ico(name):
    return f'<span class="luna-ico" data-ico="{name}"></span>'

# ---------- index.html ----------
sub_all(BASE / "static/index.html", [
    ('без страха и фатализма 🌙</h1>', 'без страха и фатализма ' + ico("moon") + '</h1>'),
    ('<span class="welcome-card__moon">🌙</span>', '<span class="welcome-card__moon">' + ico("moon") + '</span>'),
    ('<span class="welcome-card__label">Открыть карту 🌙</span>', '<span class="welcome-card__label">Открыть карту</span>'),
    ('<p class="card-hint" id="card-hint">✨ нажми на карту</p>', '<p class="card-hint" id="card-hint">' + ico("spark") + ' нажми на карту</p>'),
    ('<a href="/mac" class="luna-accent no-underline">🧩 МАК</a>', '<a href="/mac" class="luna-accent no-underline">' + ico("mirror") + ' МАК</a>'),
    ('<a href="/today" class="luna-accent no-underline">🌙 Сегодня</a>', '<a href="/today" class="luna-accent no-underline">' + ico("moon") + ' Сегодня</a>'),
    ('<script src="/static/js/gate.js?v=1"></script>',
     '<script src="/static/js/luna_icons.js?v=1"></script>\n  <script src="/static/js/gate.js?v=1"></script>'),
])

# ---------- today.html ----------
sub_all(BASE / "static/today.html", [
    ('>✨ Натальная карта →</a>', '>' + ico("spark") + ' Натальная карта →</a>'),
    ('>🃏 Расклады →</a>', '>' + ico("card") + ' Расклады →</a>'),
    ('>🧩 МАК →</a>', '>' + ico("mirror") + ' МАК →</a>'),
    ('>📖 Дневник →</a>', '>' + ico("book") + ' Дневник →</a>'),
    ('>👤 Профиль →</a>', '>' + ico("person") + ' Профиль →</a>'),
    ('data-deck="mac" aria-pressed="false">🧩 МАК</button>', 'data-deck="mac" aria-pressed="false">' + ico("mirror") + ' МАК</button>'),
    ('<div class="drawn-card__face drawn-card__back">🌙</div>', '<div class="drawn-card__face drawn-card__back">' + ico("moon") + '</div>'),
    ('disabled>Поделиться 🌙</button>', 'disabled>Поделиться</button>'),
    ("const text = '✨ Моя карта дня в LUNA AI: ' + name + ' 🌙\\n\\n«' + quote + '»\\n\\n' + location.origin;",
     "const text = '✦ Моя карта дня в LUNA AI: ' + name + ' ☾\\n\\n«' + quote + '»\\n\\n' + location.origin;"),
    ("setTimeout(() => { btn.textContent = 'Поделиться 🌙'; }, 1500);", "setTimeout(() => { btn.textContent = 'Поделиться'; }, 1500);"),
    ("document.getElementById('moon-title').textContent = m.emoji + ' ' + m.phase;",
     "document.getElementById('moon-title').innerHTML =\n"
     "        '<span class=\"luna-ico luna-ico--lg\">' + window.lunaMoonSVG(m.illumination, (m.lunar_day || 1) <= 15) + '</span> ' + m.phase;"),
    ('<script src="/static/js/gate.js?v=1"></script>',
     '<script src="/static/js/luna_icons.js?v=1"></script>\n  <script src="/static/js/gate.js?v=1"></script>'),
    ("loadMoon().catch(() => {});",
     "document.querySelectorAll('[data-ico]').forEach(el => { el.innerHTML = window.lunaIcon(el.dataset.ico); });\n\n    loadMoon().catch(() => {});"),
])

# ---------- spreads.html ----------
sub_all(BASE / "static/spreads.html", [
    ('<p class="text-xs text-[#8a8a9a] mt-2">💡 ${p.position_hint}</p>',
     '<p class="text-xs text-[#8a8a9a] mt-2">${window.lunaIcon("spark")} ${p.position_hint}</p>'),
    ('<script src="/static/js/tg.js"></script>',
     '<script src="/static/js/tg.js"></script>\n  <script src="/static/js/luna_icons.js?v=1"></script>'),
])

# ---------- mac.html ----------
sub_all(BASE / "static/mac.html", [
    ('id="draw-btn">Вытянуть карту 🧩</button>', 'id="draw-btn">Вытянуть карту</button>'),
    ("p.textContent = (sender === 'user' ? 'Вы: ' : '🌙 ') + text;",
     "p.textContent = (sender === 'user' ? 'Вы: ' : '☾ ') + text;"),
])

# ---------- natal.html ----------
sub_all(BASE / "static/natal.html", [
    ('по нему найду координаты для карты 🌍</p>', 'по нему найду координаты для карты</p>'),
    ('id="submit-btn">Рассчитать ✨</button>', 'id="submit-btn">Рассчитать</button>'),
    ("'☝ ' + note", "'✦ ' + note"),
])

# ---------- 404.html ----------
sub_all(BASE / "static/404.html", [
    ('<p class="text-5xl">🌑</p>', '<p class="text-5xl luna-accent">☾</p>'),
])

# ---------- profile.html ----------
sub_all(BASE / "static/profile.html", [
    ('Тон применён до конца сессии 🌙</p>', 'Тон применён до конца сессии ☾</p>'),
    ('дней подряд 🔥</span>', 'дней подряд ✦</span>'),
    ("const labels = { 'мягко': '🌸 Мягко', 'честно': '⚔ Честно', 'провокативно': '🔥 Провокативно', 'достигатор': '🚀 Достигатор' };",
     "const labels = { 'мягко': 'Мягко', 'честно': 'Честно', 'провокативно': 'Провокативно', 'достигатор': 'Достигатор' };"),
])

# ---------- gate.js ----------
sub_all(BASE / "static/js/gate.js", [
    ('Луна запомнит тебя 🌙</p>', 'Луна запомнит тебя ☾</p>'),
    ('сохранила данные 🌙</p>', 'сохранила данные ☾</p>'),
    ('Сохранить и продолжить ✨</button>', 'Сохранить и продолжить ✦</button>'),
])

# ---------- prompts ----------
sub_all(BASE / "prompts/__init__.py", [
    ("попробуйте через минуту. 🌙", "попробуйте через минуту. ☾"),
    ('AI_CONNECTION_LOST = "🌙 Связь', 'AI_CONNECTION_LOST = "☾ Связь'),
    ('f"✨ Приветствую тебя, {first_name}! 🔮', 'f"✦ Приветствую тебя, {first_name}! 🔮'),
    ('f"🌟 Что я умею:', 'f"✦ Что я умею:'),
    ('f"• 🎴 Расклады на любовь', 'f"• ✦ Расклады на любовь'),
    ('f"• 🌅 Ежедневная Карта Дня', 'f"• ☾ Ежедневная Карта Дня'),
    ('f"• 🧩 Метафорические ассоциативные', 'f"• 🪞 Метафорические ассоциативные'),
    ('BOT_HELP = ("📖 Команды бота:', 'BOT_HELP = ("✦ Команды бота:'),
    ('• /card — 🌅 Карта Дня', '• /card — ☾ Карта Дня'),
    ('• /mac — 🧩 Метафорическая карта (МАК)', '• /mac — 🪞 Метафорическая карта (МАК)'),
])

sub_all(BASE / "prompts/tones.py", [
    ("ты у нас огонь. 😍", "ты у нас огонь. ✦"),
])

# ---------- bot.py ----------
sub_all(BASE / "bot.py", [
    ('text="🌅 Карта дня"', 'text="☾ Карта дня"'),
    ('text="🧩 МАК"', 'text="🪞 МАК"'),
    ('text="❓ Помощь"', 'text="✦ Помощь"'),
    ('lines = [f"🌙 Карта дня: {name}"]', 'lines = [f"☾ Карта дня: {name}"]'),
    ('lines.append(f"\\n❓ {question}")', 'lines.append(f"\\n✦ {question}")'),
    ('lines.append(f"\\n💫 {affirmation}")', 'lines.append(f"\\n✦ {affirmation}")'),
    ('lines = ["✨ Ваша Большая тройка",', 'lines = ["✦ Ваша Большая тройка",'),
    ('"🌙 Чтобы рассчитать вашу Большую тройку', '"☾ Чтобы рассчитать вашу Большую тройку'),
    ('"🌙 Не похоже на дату.', '"☾ Не похоже на дату.'),
    ('f"🎴 *{name}* {', 'f"✦ *{name}* {'),
    ("f\"▪ {', '.join(keywords)}\\n💡 {meaning}\\n❓ _{question}_\"",
     "f\"▪ {', '.join(keywords)}\\n• {meaning}\\n✦ _{question}_\""),
    ("\\n💡 {meaning}\")", "\\n• {meaning}\")"),
    ('f"🧩 *МАК-Самоанализ*', 'f"🪞 *МАК-Самоанализ*'),
    ("f\"_{card['metaphor']}_\\n\\n❓ {card['guidingQuestions'][0]}",
     "f\"_{card['metaphor']}_\\n\\n✦ {card['guidingQuestions'][0]}"),
    ('"🌙 Карты сейчас хранят молчание', '"☾ Карты сейчас хранят молчание'),
])
print("ALL DONE")
