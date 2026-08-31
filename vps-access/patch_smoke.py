import pathlib

p = pathlib.Path("/opt/luna-ai-py/tests/smoke_test.py")
s = p.read_text(encoding="utf-8")
old = '    print("SMOKE OK")'
new = '''    # 6. Регрессия ритуала карты: раскрытие ТОЛЬКО по клику.
    # Headless-проверка статики: в разметке /today нет раскрытого состояния
    # (класс is-flipped проставляется только из ritual.js по клику) и нет
    # inline-таймеров, раскрывающих карту; страница подключает ritual.js.
    # Состояние DOM после 10 с без действий дополнительно проверяется живым
    # браузером (матрица тестов) — здесь гарантируем отсутствие исходных
    # предпосылок автораскрытия.
    status, _ = head("/today")
    step("/today -> 200", status == 200)
    today_html = urllib.request.urlopen(BASE + "/today", timeout=30).read().decode("utf-8")
    step("ритуал: today подключает ritual.js",
         "ritual.js" in today_html,
         "подключите <script src=/static/js/ritual.js>")
    step("ритуал: нет inline-раскрытия карты",
         "is-flipped" not in today_html,
         "в today.html не должно быть собственной логики is-flipped / авто-draw")
    ritual_js = urllib.request.urlopen(BASE + "/static/js/ritual.js", timeout=30).read().decode("utf-8")
    adds = ritual_js.count("classList.add('is-flipped')")
    removes = ritual_js.count("classList.remove('is-flipped')")
    step("ритуал: is-flipped только в createRitual.draw",
         adds == 1 and removes >= 1 and "SHUFFLE_MS" in ritual_js,
         f"adds={adds} (ожидается 1 — только в draw по клику), removes={removes}")

    print("SMOKE OK")'''
assert old in s, "print SMOKE OK not found"
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")
print("smoke patched")
