/* ============================================================
   Курсор «Посмотреть» над карточками кейсов (Figma 10098:72526).
   Над ссылкой-витриной (a.show) вместо стрелки едет точка и тёмная
   кнопка «Посмотреть» под ней. Кнопка догоняет мышь с лёгкой
   инерцией; при «уменьшить движение» — без инерции.
   Только мышь: на тачскрине и с клавиатуры ничего не появляется.
   ============================================================ */
(function () {
  'use strict';

  var cards = document.querySelectorAll('a.show');
  if (!cards.length) return;

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var el = document.createElement('div');
  el.className = 'cursor-pill';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="cursor-pill__in"><span class="cursor-pill__dot"></span>' +
    '<span class="cursor-pill__btn">Посмотреть</span></div>';
  document.body.appendChild(el);

  var x = 0, y = 0, cx = 0, cy = 0, raf = 0;

  function place() { el.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'; }

  function tick() {
    var k = reduced.matches ? 1 : 0.32;
    cx += (x - cx) * k;
    cy += (y - cy) * k;
    place();
    raf = (Math.abs(x - cx) > 0.2 || Math.abs(y - cy) > 0.2) ? requestAnimationFrame(tick) : 0;
  }

  function enter(e) {
    if (!fine.matches || e.pointerType !== 'mouse') return;
    x = cx = e.clientX;
    y = cy = e.clientY;
    place();
    el.classList.add('is-on');
  }

  function move(e) {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX;
    y = e.clientY;
    if (!el.classList.contains('is-on')) enter(e);
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function leave() { el.classList.remove('is-on'); }

  cards.forEach(function (card) {
    card.addEventListener('pointerenter', enter);
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
  });

  // Ушли со страницы по клику на кейс — кнопку убираем сразу
  window.addEventListener('pagehide', leave);
  window.addEventListener('blur', leave);
})();
