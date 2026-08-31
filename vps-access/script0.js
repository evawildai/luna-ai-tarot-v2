
    function showFieldError(id, el) {
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
document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
      const consent = document.getElementById('consent');
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
    });