"""Одноразовая конвертация src/data/*.ts из старого проекта в data/*.json без потерь."""
import json
import re
from pathlib import Path

import json5

OLD = Path(__file__).resolve().parent.parent / "src" / "data"
NEW = Path(__file__).resolve().parent / "data"

FILES = {
    "tarotCards.ts": "tarot.json",
    "macCards.ts": "mac.json",
    "spreads.ts": "spreads.json",
}

for src, dst in FILES.items():
    text = (OLD / src).read_text(encoding="utf-8")
    # Убираем import и export ... = [], оставляя чистое выражение-массив.
    text = re.sub(r"^import .*?;$", "", text, flags=re.M)
    text = re.sub(r"export const \w+ = \w+;", "", text, flags=re.M)
    text = re.sub(r"export const \w+(:\s*\w+\[\])?\s*=\s*", "", text, flags=re.M)
    text = text.replace("// Key Minor Arcana additions for rich spread dynamics", "").strip()
    text = re.sub(r";\s*$", "", text)  # json5 не допускает statement-semicolon после ]
    data = json5.loads(text)
    out = NEW / dst
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{src} -> {dst}: {len(data)} записей, ключей в первой записи: {len(data[0])}")
