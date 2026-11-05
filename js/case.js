/* ============================================================
   Кейс-стади: поведение страницы. Без библиотек.

   2. Меню кейса          — подсветка раздела по скроллу + плавный переход
   3. «Было / Стало»      — переключение с кроссфейдом
   Слоты картинок и слайдеры — общие для всех страниц, лежат в js/ui.js
   ============================================================ */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ---------- 2. Меню кейса ---------- */
  var links = $$('.case-nav__link');
  var chapters = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);
  var lockUntil = 0;      // пока идёт прокрутка по клику, скролл не трогает подсветку
  var current = null;

  function navTop() {
    var v = getComputedStyle(document.body).getPropertyValue('--nav-top');
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:' + v;
    document.body.appendChild(probe);
    var px = probe.offsetHeight;
    probe.remove();
    return px || 110;
  }

  var offset = navTop();

  function setActive(id) {
    if (id === current) return;
    current = id;
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    // На планшете и телефоне меню — строка, которая листается вбок: держим активный пункт в поле зрения
    var list = links[0] && links[0].closest('.case-nav__list');
    var on = links.filter(function (l) { return l.getAttribute('href') === '#' + id; })[0];
    if (list && on && list.scrollWidth > list.clientWidth + 1) {
      var x = on.offsetLeft - parseFloat(getComputedStyle(list).paddingLeft || 0);
      list.scrollTo({ left: Math.max(0, x), behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  function spy() {
    // Раздел активен, когда его верх прошёл линию залипания меню
    var line = offset + 32;
    var id = chapters.length ? chapters[0].id : null;
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].getBoundingClientRect().top <= line) id = chapters[i].id;
    }
    // В самом низу страницы активен последний раздел
    var doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2 && chapters.length) {
      var last = chapters[chapters.length - 1];
      if (last.getBoundingClientRect().top < window.innerHeight) id = last.id;
    }
    if (Date.now() > lockUntil && id) setActive(id);

  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; spy(); });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { offset = navTop(); onScroll(); });
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', function () { lockUntil = 0; spy(); });
  }

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      setActive(id);
      lockUntil = Date.now() + 1200;
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + id);
    });
  });

  spy();

  /* ---------- 3. «Было / Стало» ---------- */
  $$('.compare').forEach(function (box) {
    var seg = box.querySelector('.segment');
    var btns = $$('.segment__btn', box);
    var panes = $$('.compare__pane', box);
    function show(value) {
      seg.dataset.value = value;
      btns.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.value === value));
      });
      panes.forEach(function (p) {
        var on = p.dataset.value === value;
        p.classList.toggle('is-active', on);
        p.setAttribute('aria-hidden', String(!on));
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { show(b.dataset.value); });
    });
    show(seg.dataset.value || 'after');
  });

})();

/* «Вернуться» в парящем меню: открываем главную и плавно доезжаем
   до карточки этого кейса (её id = имя файла кейса, см. js/ui.js) */
(function () {
  'use strict';
  var back = document.querySelector('[data-back]');
  if (!back) return;
  back.addEventListener('click', function () {
    var id = location.pathname.split('/').pop().replace(/\.html$/, '');
    try { sessionStorage.setItem('backTo', id); } catch (err) {}
  });
})();
