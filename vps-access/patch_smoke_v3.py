import pathlib

p = pathlib.Path("/opt/luna-ai-py/tests/smoke_test.py")
s = p.read_text(encoding="utf-8")

old = '''    ritual_js = urllib.request.urlopen(BASE + "/static/js/ritual.js", timeout=30).read().decode("utf-8")
    adds = ritual_js.count("classList.add('is-flipped')")
    removes = ritual_js.count("classList.remove('is-flipped')")
    step("ритуал: is-flipped только в createRitual.draw",
         adds == 1 and removes >= 1 and "SHUFFLE_MS" in ritual_js,
         f"adds={adds} (ожидается 1 — только в draw по клику), removes={removes}")'''
new = '''    ritual_js = urllib.request.urlopen(BASE + "/static/js/ritual.js", timeout=30).read().decode("utf-8")
    # v3 (колода с выбором): is-flipped проставляется ТОЛЬКО в reveal() по тапу
    # на рубашку; автопереходов нет (setState spread/revealed — только из
    # обработчиков явных действий). Живой DOM-чек (5 рубашек после клика,
    # 10 c — ноль is-flipped, после тапа — ровно один) выполняется браузером
    # в матрице тестов; тут — статические гарантии.
    adds = ritual_js.count("classList.add('is-flipped')")
    step("ритуал v3: is-flipped только в reveal() по тапу",
         adds == 1 and "reveal(cardEl)" in ritual_js and "state !== 'spread'" in ritual_js,
         f"adds={adds} (ожидается 1 — только в reveal по тапу)")
    step("ритуал v3: today содержит веер",
         "card-fan" in today_html and "Тянуть карту" in today_html,
         "контейнер веера card-fan отсутствует")'''
assert old in s
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("smoke v3 patched")
