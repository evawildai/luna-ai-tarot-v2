"""OG-превью: og-luna.png (PIL) + OG-теги на всех страницах + новые <title>."""
import pathlib

BASE = pathlib.Path("/opt/luna-ai-py")

# ---------- 1. og-luna.png: чёрный фон, фиолетовое свечение, серебряный wordmark ----------
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
img = Image.new("RGB", (W, H), (5, 5, 7))
draw = ImageDraw.Draw(img)

# фиолетовое свечение: несколько размытых эллипсов
glow = Image.new("RGB", (W, H), (5, 5, 7))
gd = ImageDraw.Draw(glow)
gd.ellipse([W/2-500, H/2-320, W/2+500, H/2+320], fill=(46, 22, 92))
gd.ellipse([W/2-300, H/2-200, W/2+300, H/2+200], fill=(70, 34, 130))
glow = glow.filter(ImageFilter.GaussianBlur(140))
img = Image.blend(img, glow, 0.9)

draw = ImageDraw.Draw(img)
# тонкие неон-линии: орбиты
for rx, ry, alpha in [(430, 230, 60), (330, 170, 90)]:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse([W/2-rx, H/2-ry, W/2+rx, H/2+ry], outline=(139, 92, 246, alpha), width=2)
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
draw = ImageDraw.Draw(img)

font_dir = "/usr/share/fonts/truetype/dejavu/"
try:
    big = ImageFont.truetype(font_dir + "DejaVuSans-Bold.ttf", 150)
    small = ImageFont.truetype(font_dir + "DejaVuSans.ttf", 44)
    tiny = ImageFont.truetype(font_dir + "DejaVuSans.ttf", 30)
except OSError:
    big = small = tiny = ImageFont.load_default()

def center(y, text, font, fill):
    w = draw.textlength(text, font=font)
    draw.text(((W - w) / 2, y), text, font=font, fill=fill)

# серебряный wordmark с лёгким свечением
for off, color in [(6, (90, 60, 160)), (3, (120, 80, 200)), (0, (214, 213, 224))]:
    w = draw.textlength("LUNA AI", font=big)
    draw.text(((W - w) / 2 + off, H/2 - 150 + off), "LUNA AI", font=big, fill=color)
center(H/2 + 70, "таро · МАК · луна", small, (192, 192, 208))
center(H - 90, "без страха и фатализма ☾", tiny, (138, 138, 154))

og_dir = BASE / "static/og"
og_dir.mkdir(exist_ok=True)
img.save(og_dir / "og-luna.png", optimize=True)
print("og-luna.png:", (og_dir / "og-luna.png").stat().st_size, "bytes")

# ---------- 2. <title> и OG-теги на всех страницах ----------
DESC = "Карта дня, расклады, МАК и натальная карта — без страха и фатализма ☾"
titles = {
    "index.html": "LUNA AI — таро, МАК и лунный навигатор",
    "today.html": "Сегодня · LUNA AI",
    "spreads.html": "Расклады · LUNA AI",
    "mac.html": "МАК · LUNA AI",
    "natal.html": "Натальная карта · LUNA AI",
    "journal.html": "Дневник · LUNA AI",
    "profile.html": "Профиль · LUNA AI",
    "policy.html": "Политика · LUNA AI",
    "404.html": "Страница не найдена · LUNA AI",
}
URLS = {
    "index.html": "https://lunalis.ru/",
    "today.html": "https://lunalis.ru/today",
    "spreads.html": "https://lunalis.ru/spreads",
    "mac.html": "https://lunalis.ru/mac",
    "natal.html": "https://lunalis.ru/natal",
    "journal.html": "https://lunalis.ru/journal",
    "profile.html": "https://lunalis.ru/profile",
    "policy.html": "https://lunalis.ru/policy",
}

for name, title in titles.items():
    p = BASE / "static" / name
    if not p.exists():
        continue
    s = p.read_text(encoding="utf-8")
    # <title>
    import re
    s = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", s, count=1, flags=re.S)
    # OG-блок после </title>, если его ещё нет
    if "og:title" not in s:
        url = URLS.get(name, "https://lunalis.ru/")
        og = (
            f"\n  <meta property=\"og:title\" content=\"{title}\" />"
            f"\n  <meta property=\"og:description\" content=\"{DESC}\" />"
            f"\n  <meta property=\"og:url\" content=\"{url}\" />"
            f"\n  <meta property=\"og:type\" content=\"website\" />"
            f"\n  <meta property=\"og:image\" content=\"https://lunalis.ru/static/og/og-luna.png\" />"
            f"\n  <meta property=\"og:image:width\" content=\"1200\" />"
            f"\n  <meta property=\"og:image:height\" content=\"630\" />"
            f"\n  <meta name=\"twitter:card\" content=\"summary_large_image\" />"
        )
        s = s.replace("</title>", "</title>" + og, 1)
    p.write_text(s, encoding="utf-8")
    print("og:", name)
