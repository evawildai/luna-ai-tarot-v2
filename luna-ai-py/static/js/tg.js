// Telegram WebApp: инициализация темы и подписанные initData для бэкенда.
// В браузере (вне Telegram) скрипт безопасно ничего не делает — включается гостевой режим.
(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  if (!tg) {
    window.LUNA_TG = null;
    window.LUNA_INIT_DATA = '';
    return;
  }
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#050507'); tg.setBackgroundColor('#050507'); } catch (e) { /* старые версии */ }
  window.LUNA_TG = tg;
  // Подписанная строка initData (hash + auth_date). Валидируется на бэкенде.
  window.LUNA_INIT_DATA = typeof tg.initData === 'string' ? tg.initData : '';
})();

window.lunaHeaders = function () {
  return window.LUNA_INIT_DATA
    ? { 'X-Telegram-Init-Data': window.LUNA_INIT_DATA }
    : {}; // гость
};
