"""Тесты устойчивого парсинга ответов Gemini (обрывы JSON, заборы, мусор)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai import parse_json_loose

CASES = [
    # (вход, ожидаемый результат или None)
    ('{"reply": "ок"}', {"reply": "ок"}),
    ('```json\n{"a": 1}\n```', {"a": 1}),
    ('{"reply": "обра', {"reply": "обра"}),
    ('{"a": ["x", "y', {"a": ["x", "y"]}),
    ('{"list": [{"n": 1}, {"n": "два"', {"list": [{"n": 1}, {"n": "два"}]}),
    ('{"a": 1, "b":', {"a": 1}),
    ('{"a": "текст с \\"кавычками\\" внутри"}', {"a": 'текст с "кавычками" внутри'}),
    ('{"a": "экранирование \\" и обры', {"a": 'экранирование " и обры'}),
    ('{"suggestedFollowUps": ["в1", "в2", "в', {"suggestedFollowUps": ["в1", "в2", "в"]}),
    ("мусор", None),
    ("", None),
]


def main() -> None:
    failed = 0
    for text, expected in CASES:
        got = parse_json_loose(text)
        if got != expected:
            print(f"FAIL: {text!r} -> {got!r}, ожидалось {expected!r}")
            failed += 1
    if failed:
        raise SystemExit(f"{failed} тестов упало")
    print(f"ok: {len(CASES)} случаев")


if __name__ == "__main__":
    main()
