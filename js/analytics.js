/* ============================================================
   Цели Яндекс Метрики (счётчик 113790440) — без библиотек.

   Метрика включается только на niknikolaev.ru (код счётчика в <head>),
   поэтому локально цели никуда не уходят — пишутся в консоль.

   Цели (их идентификаторы заводятся в Метрике как «JavaScript-событие»):
   · resume        — нажали «Резюме»
   · contact       — любой контакт: скопировали контакт или перешли в Telegram
   · contact_copy  — скопировали контакт (js/tg.js, только при успехе)
   · contact_open  — перешли в профиль Telegram
   · segment       — переключили «Было/Стало», «Мобайл/Десктоп» и т. п.
                     параметры: страница, блок, что выбрали
   · scroll_50, scroll_90 — пролистали страницу на 50 % и на 90 %
                     (по одному разу за открытие страницы)
   Переходы в кейсы считаются целями типа «Посещение страниц» — кода не нужно.

   Кнопки размечаются атрибутом data-goal="имя" — клик отправляет цель.
   ============================================================ */
(function () {
  'use strict';

  var COUNTER = 113790440;
  var page = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';

  function goal(name, params) {
    var p = params || {};
    p.page = page;
    if (typeof window.ym === 'function') window.ym(COUNTER, 'reachGoal', name, p);
    else if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) console.debug('[goal]', name, p);
  }
  window.siteGoal = goal;   // для js/tg.js

  // Кнопки с data-goal: «Резюме», «Перейти в профиль»
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-goal]');
    if (!el) return;
    el.getAttribute('data-goal').split(/\s+/).forEach(function (name) { if (name) goal(name); });
  });

  // Переключатели «Было/Стало» и другие segment-кнопки внутри кейсов
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.segment__btn');
    if (!btn || btn.getAttribute('aria-pressed') === 'true') return;   // клик по уже выбранному — не считаем
    var seg = btn.closest('.segment');
    var chapter = btn.closest('.chapter');
    goal('segment', {
      block: chapter ? chapter.id : '',
      control: seg ? seg.getAttribute('aria-label') : '',
      value: btn.textContent.trim()
    });
  }, true);   // до обработчика переключателя: он меняет aria-pressed

  // Глубина прокрутки: 50 % и 90 % страницы, по разу
  var marks = [50, 90];
  var sent = {};
  var ticking = false;
  function checkScroll() {
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 100;
    marks.forEach(function (m) {
      if (!sent[m] && pct >= m) { sent[m] = true; goal('scroll_' + m); }
    });
    if (sent[50] && sent[90]) window.removeEventListener('scroll', onScroll);
  }
  function onScroll() {
    if (!ticking) { ticking = true; setTimeout(checkScroll, 150); }   // не чаще раза в 150 мс
  }
  window.addEventListener('scroll', onScroll, { passive: true });
})();
