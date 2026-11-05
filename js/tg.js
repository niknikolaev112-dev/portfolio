/* ============================================================
   Кнопка Telegram с меню (Figma 10456:94213) — без библиотек.

   1. «Telegram ∨» открывает меню над кнопкой, стрелка поворачивается.
   2. «Скопировать ссылку» → в буфер уходит подпись и ссылка
      (текст из data-tg-copy: «Николаев Николай, Product Designer» + t.me), иконка превращается
      в галочку, текст — в «Скопировано». Через 3,5 с меню само
      плавно закрывается (медленнее, чем по клику). Повторный клик
      копирует ещё раз и запускает отсчёт заново.
   3. Не вышло (браузер не дал доступ к буферу) — запасной способ;
      не помог и он — оранжевый «!», «Не скопировалось» и ссылка
      текстом, уже выделенная для ручного копирования. Само не закрывается.
   4. Закрывается: повторным нажатием, кликом мимо, Esc, переходом
      в профиль, уходом со страницы.
   5. Клавиатура: открыли с клавиатуры — фокус на первом пункте,
      стрелки ↑↓ ходят по пунктам, Esc возвращает фокус на кнопку.
   6. Меню не вылезает за край экрана: сдвигается (--tg-shift).
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-tg]');
  if (!root) return;

  var btn = root.querySelector('.tg__btn');
  var menu = root.querySelector('.tg__menu');
  var copy = root.querySelector('[data-tg-copy]');
  var status = root.querySelector('[data-tg-status]');
  var text = copy.getAttribute('data-tg-copy');   // «Николаев Николай, Product Designer» + перенос + ссылка
  var items = [].slice.call(menu.querySelectorAll('[role="menuitem"]'));

  var AUTO_CLOSE = 3500;   // «Закрыть через 3 секунды» из макета + полсекунды на анимацию галочки
  var RESET_AFTER = 260;   // сброс «Скопировано» — когда меню уже скрылось
  var EDGE = 12;           // минимальный отступ меню от края экрана
  var closeTimer = null;
  var resetTimer = null;
  var copying = false;     // запасное копирование уводит фокус в textarea — меню не закрываем

  menu.hidden = false;     // без JS меню не нужно; с JS прячем через класс
  menu.inert = true;

  function isOpen() { return root.classList.contains('is-open'); }

  // Считаем от кнопки, а не от меню: у меню в момент открытия ещё идёт анимация масштаба
  function place() {
    var b = root.getBoundingClientRect();
    var w = menu.offsetWidth;
    var vw = document.documentElement.clientWidth;
    var left = b.left + b.width / 2 - w / 2;
    var shift = 0;
    if (left + w > vw - EDGE) shift = vw - EDGE - (left + w);
    if (left + shift < EDGE) shift = EDGE - left;
    menu.style.setProperty('--tg-shift', Math.round(shift) + 'px');
  }

  function open(viaKeyboard) {
    clearTimeout(resetTimer);
    menu.classList.remove('is-soft');
    reset();
    root.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    menu.inert = false;
    place();
    if (viaKeyboard) items[0].focus();
  }

  function close(returnFocus) {
    if (!isOpen()) return;
    clearTimeout(closeTimer);
    root.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    menu.inert = true;
    if (returnFocus) btn.focus();
    resetTimer = setTimeout(reset, RESET_AFTER);
  }

  function reset() {
    copy.classList.remove('is-done', 'is-fail');
    menu.classList.remove('is-fail');
    status.textContent = '';
  }

  // Само закрывается через 3,5 с — мягче обычного (класс is-soft в CSS).
  // Если фокус был в меню (открывали с клавиатуры) — возвращаем его на кнопку
  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      menu.classList.add('is-soft');
      close(menu.contains(document.activeElement));
      // «Скопировано» не должно смениться обратно, пока меню ещё видно
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () { menu.classList.remove('is-soft'); reset(); }, 600);
    }, AUTO_CLOSE);
  }

  // Запасной способ копирования: старые браузеры, http, запрет доступа
  function legacyCopy(text) {
    var back = document.activeElement;
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    if (back && back.focus) back.focus({ preventScroll: true });
    return ok;
  }

  function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  function done() {
    menu.classList.remove('is-fail');
    copy.classList.remove('is-fail');
    // перезапуск анимации при повторном копировании
    copy.classList.remove('is-done');
    void copy.offsetWidth;
    copy.classList.add('is-done');
    status.textContent = 'Ссылка скопирована';
    if (window.siteGoal) { window.siteGoal('contact'); window.siteGoal('contact_copy'); }
    scheduleClose();
  }

  function fail() {
    clearTimeout(closeTimer);
    copy.classList.remove('is-done');
    copy.classList.add('is-fail');
    menu.classList.add('is-fail');
    status.textContent = 'Не скопировалось. Ссылка: t.me/niknikstd';
    // выделяем ссылку — останется нажать Cmd+C
    var link = menu.querySelector('.tg__url');
    var sel = window.getSelection && window.getSelection();
    if (sel && link) {
      var range = document.createRange();
      range.selectNodeContents(link);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  btn.addEventListener('click', function (e) {
    if (isOpen()) close(false);
    else open(e.detail === 0);     // detail 0 — нажали Enter/пробел, а не мышью
  });

  copy.addEventListener('click', function () {
    copying = true;
    writeClipboard(text).then(function (ok) {
      copying = false;
      ok ? done() : fail();
    });
  });

  // «Перейти в профиль» — открывается Telegram, меню больше не нужно
  items[items.length - 1].addEventListener('click', function () { close(false); });

  document.addEventListener('pointerdown', function (e) {
    if (isOpen() && !root.contains(e.target)) close(false);
  });

  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var i = items.indexOf(document.activeElement);
      var next = e.key === 'ArrowDown' ? i + 1 : i - 1;
      if (i === -1) next = e.key === 'ArrowDown' ? 0 : items.length - 1;
      items[(next + items.length) % items.length].focus();
    }
  });

  // Фокус ушёл из меню клавишей Tab — закрываем
  root.addEventListener('focusout', function (e) {
    if (copying || !isOpen()) return;
    if (e.relatedTarget && !root.contains(e.relatedTarget)) close(false);
  });

  window.addEventListener('resize', function () { if (isOpen()) place(); });
  window.addEventListener('pagehide', function () { close(false); reset(); });
})();
