import pathlib

p = pathlib.Path("/opt/luna-ai-py/routers/api.py")
s = p.read_text(encoding="utf-8")

# POST /api/event — фронтовые события (welcome_shown, data_prompt_shown, ...) в общую воронку
old = '''@router.post("/onboarding")'''
new = '''class FrontEvent(BaseModel):
    type: str
    payload: str | None = None


@router.post("/event")
def front_event(payload: FrontEvent, user: CurrentUser = Depends(get_current_user)):
    """События входа из Mini App — общая воронка с ботом (events)."""
    allowed = {"welcome_shown", "data_prompt_shown", "data_saved"}
    if payload.type not in allowed:
        raise HTTPException(400, "unknown event type")
    log_event(_db_user_id(user), payload.type, payload.payload)
    return {"ok": True}


@router.post("/onboarding")'''
assert old in s
s = s.replace(old, new, 1)

# в onboarding добавляем data_saved (воронка сбора данных)
old2 = '''    log_event(_db_user_id(user), "onboarding_done", json.dumps({"city": payload.city}, ensure_ascii=False))'''
new2 = '''    log_event(_db_user_id(user), "onboarding_done", json.dumps({"city": payload.city}, ensure_ascii=False))
    log_event(_db_user_id(user), "data_saved", json.dumps({"birth_date": payload.birth_date}, ensure_ascii=False))'''
assert old2 in s
s = s.replace(old2, new2, 1)

p.write_text(s, encoding="utf-8")
print("api patched")
