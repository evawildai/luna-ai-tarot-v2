import pathlib

HELPERS = """function showFieldError(id, el) {
      const msg = document.getElementById(id + '-error');
      msg.classList.add('is-visible');
      if (el) {
        el.classList.add('is-invalid');
        el.classList.remove('luna-shake');
        void el.offsetWidth;
        el.classList.add('luna-shake');
      }
    }
    function clearErrors() {
      document.querySelectorAll('.luna-field-error').forEach(m => m.classList.remove('is-visible'));
      document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }
"""


def replace_js(html, listener_head, old_body, new_body):
    start = html.index(listener_head)
    end = html.index("</script>", start)
    old_block = html[start:end]
    assert old_body in old_block, "old JS body not found"
    new_block = HELPERS + listener_head + "\n" + new_body
    return html[:start] + new_block + html[end:]


# ---------- index.html ----------
p = pathlib.Path("/opt/luna-ai-py/static/index.html")
s = p.read_text(encoding="utf-8")
s = s.replace('<form id="onboarding-form" class="space-y-4">',
              '<form id="onboarding-form" class="space-y-4" novalidate>')
s = s.replace(
    '<input type="checkbox" id="consent" required class="mt-0.5 accent-violet-500" />',
    '<input type="checkbox" id="consent" class="luna-consent mt-0.5 accent-violet-500" />')
s = s.replace(
    """<a href="/policy" class="underline">политику конфиденциальности</a>.</span>
      </label>""",
    """<a href="/policy" class="underline">политику конфиденциальности</a>.</span>
      </label>
      <p id="consent-error" class="luna-field-error">Нужно твоё согласие, чтобы Луна сохранила данные 🌙</p>""")
s = s.replace(
    """<input class="luna-input" type="date" id="birth_date" name="birth_date" required />
      </div>""",
    """<input class="luna-input" type="date" id="birth_date" name="birth_date" />
        <p id="birth_date-error" class="luna-field-error">Укажи дату рождения — без неё не посчитаю карту</p>
      </div>""")

old_body = """      const btn = document.getElementById('submit-btn');
      const err = document.getElementById('error');
      err.classList.add('hidden');
      btn.disabled = true;
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...window.lunaHeaders() },
          body: JSON.stringify({
            birth_date: document.getElementById('birth_date').value || null,
            birth_time: document.getElementById('birth_time').value || null,
            city: document.getElementById('city').value || null,
            consent: document.getElementById('consent').checked,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка сохранения');
        const bd = document.getElementById('birth_date').value;
        if (bd) localStorage.setItem('luna_birth_date', bd);
        location.href = '/today';
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.remove('hidden');
      } finally {
        btn.disabled = false;
      }
    });"""
new_body = """      const consent = document.getElementById('consent');
      const bd = document.getElementById('birth_date');
      if (!consent.checked) { showFieldError('consent', consent); return; }
      if (!bd.value) { showFieldError('birth_date', bd); bd.focus(); return; }
      const btn = document.getElementById('submit-btn');
      const err = document.getElementById('error');
      err.classList.add('hidden');
      btn.disabled = true;
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...window.lunaHeaders() },
          body: JSON.stringify({
            birth_date: bd.value || null,
            birth_time: document.getElementById('birth_time').value || null,
            city: document.getElementById('city').value || null,
            consent: consent.checked,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка сохранения');
        localStorage.setItem('luna_birth_date', bd.value);
        location.href = '/today';
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.remove('hidden');
      } finally {
        btn.disabled = false;
      }
    });"""
s = replace_js(s, "document.getElementById('onboarding-form').addEventListener('submit', async (e) => {",
               old_body, new_body)
p.write_text(s, encoding="utf-8")
print("index OK", len(s))

# ---------- natal.html ----------
p = pathlib.Path("/opt/luna-ai-py/static/natal.html")
s = p.read_text(encoding="utf-8")
s = s.replace('<form id="natal-form" class="space-y-4">',
              '<form id="natal-form" class="space-y-4" novalidate>')
s = s.replace(
    """<input class="luna-input" type="date" id="birth_date" required />
        </div>""",
    """<input class="luna-input" type="date" id="birth_date" />
          <p id="birth_date-error" class="luna-field-error">Укажи дату рождения — без неё не посчитаю карту</p>
        </div>""")
s = s.replace(
    """<input class="luna-input" type="text" id="city" placeholder="Москва" required />
        </div>""",
    """<input class="luna-input" type="text" id="city" placeholder="Москва" />
          <p id="city-error" class="luna-field-error">Укажи город — по нему найду координаты для карты 🌍</p>
        </div>""")

old_body = """      const btn = document.getElementById('submit-btn');
      const err = document.getElementById('error');
      err.classList.add('hidden');
      btn.disabled = true;
      try {
        const res = await fetch('/api/natal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...window.lunaHeaders() },
          body: JSON.stringify({
            birth_date: document.getElementById('birth_date').value,
            birth_time: document.getElementById('birth_time').value || null,
            city: document.getElementById('city').value,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || 'Ошибка расчёта');
        render(body);
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.remove('hidden');
      } finally {
        btn.disabled = false;
      }
    });"""
new_body = """      const bd = document.getElementById('birth_date');
      const city = document.getElementById('city');
      if (!bd.value) { showFieldError('birth_date', bd); bd.focus(); return; }
      if (!city.value.trim()) { showFieldError('city', city); city.focus(); return; }
      const btn = document.getElementById('submit-btn');
      const err = document.getElementById('error');
      err.classList.add('hidden');
      btn.disabled = true;
      try {
        const res = await fetch('/api/natal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...window.lunaHeaders() },
          body: JSON.stringify({
            birth_date: bd.value,
            birth_time: document.getElementById('birth_time').value || null,
            city: city.value,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || 'Ошибка расчёта');
        render(body);
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.remove('hidden');
      } finally {
        btn.disabled = false;
      }
    });

"""
s = replace_js(s, "document.getElementById('natal-form').addEventListener('submit', async (e) => {",
               old_body, new_body)
p.write_text(s, encoding="utf-8")
print("natal OK", len(s))
