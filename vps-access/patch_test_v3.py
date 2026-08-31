"""test_ai_live: два вопроса x 4 тона, вывод ответов + модель."""
import pathlib

p = pathlib.Path("/opt/luna-ai-py/tests/test_ai_live.py")
s = p.read_text(encoding="utf-8")

old = '''    question = "Что мне делать с новой работой, если сомневаюсь?"
    results = {}
    for tone, tg_id in tone_ids.items():
        init = make_init_data(tg_id, f"Demo{tg_id % 10}", bot_token) if bot_token else ""
        replies = []
        for _ in range(2):
            time.sleep(30)  # TPM бесплатного тира Groq ~6-8k: пачка в минуту не пролезает
            r = api("POST", "/api/ask", {
                "deck": "tarot", "card_id": sun["id"], "mode": "question", "question": question,
            }, init)
            check("ask.reply не пустой", bool(r.get("reply")), str(r)[:200])
            replies.append(r["reply"])
        results[tone] = replies
        print(f"\\n=== Тон: {tone} ===")
        for i, rep in enumerate(replies, 1):
            print(f"--- ответ {i} ---\\n{rep}\\n")

    distinct = len({r for rs in results.values() for r in rs})
    check("все 8 ответов различаются (тон реально влияет)", distinct == 8, f"уникальных: {distinct}")'''

new = '''    # Тона v3: 4 тона x 2 вопроса (Q1 — сомнения в работе, Q2 — босс навалил работы)
    questions = [
        "Что мне делать с новой работой, если сомневаюсь?",
        "Босс снова навалил работы и говорит „спасибо же“, я бесит",
    ]
    results = {}
    models = {}
    for tone, tg_id in tone_ids.items():
        init = make_init_data(tg_id, f"Demo{tg_id % 10}", bot_token) if bot_token else ""
        replies = []
        for q in questions:
            time.sleep(30)  # TPM бесплатного тира Groq ~6-8k: пачка в минуту не пролезает
            r = api("POST", "/api/ask", {
                "deck": "tarot", "card_id": sun["id"], "mode": "question", "question": q,
            }, init)
            check("ask.reply не пустой", bool(r.get("reply")), str(r)[:200])
            models[tone] = r.get("ai_provider", "local")
            replies.append({"q": q, "reply": r.get("reply", ""), "provider": r.get("ai_provider", "local")})
        results[tone] = replies
        print(f"\\n=== Тон: {tone} (модель: {models[tone]}) ===")
        for i, item in enumerate(replies, 1):
            print(f"--- Q{i}: {item['q']}\\n{item['reply']}\\n")

    distinct = len({r["reply"] for rs in results.values() for r in rs})
    check("все 8 ответов различаются (тон реально влияет)", distinct == 8, f"уникальных: {distinct}")'''

assert old in s, "test body not found"
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")
print("test_ai_live updated")
