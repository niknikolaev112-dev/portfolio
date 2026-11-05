/* ============================================================
   Меню на телефоне: бургер в парящем меню открывает карточку
   с разделами и почтой. Карточка вырастает из бургера (CSS).

   Закрывается: повторным нажатием, тапом мимо, Esc, выбором
   пункта, переходом на ширину десктопа.
   ============================================================ */

(function () {
  'use strict';

  var bar = document.querySelector('.floatbar');
  var btn = bar && bar.querySelector('.floatbar__burger');
  var pop = document.getElementById('site-menu');
  if (!btn || !pop) return;

  function isOpen() { return bar.classList.contains('is-open'); }

  function open(byKeyboard) {
    bar.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    pop.removeAttribute('inert');
    if (byKeyboard) {
      var first = pop.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    }
  }

  function close(returnFocus) {
    if (!isOpen()) return;
    bar.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    pop.setAttribute('inert', '');
    if (returnFocus) btn.focus({ preventScroll: true });
  }

  btn.addEventListener('click', function (e) {
    if (isOpen()) close(false);
    else open(e.detail === 0);          // detail 0 — нажали с клавиатуры
  });

  document.addEventListener('pointerdown', function (e) {
    if (isOpen() && !bar.contains(e.target)) close(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) close(true);
  });

  pop.addEventListener('click', function (e) {
    if (e.target.closest('a')) close(false);
  });

  var mq = window.matchMedia('(min-width: 768px)');
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function (e) {
    if (e.matches) close(false);
  });
})();
