/* ============================================================
   Общее поведение для всех страниц. Без библиотек.

   1. Слоты картинок — заглушка, пока файла нет
   4. Слайдеры       — автопрокрутка раз в 4 секунды по кругу,
                       точки-индикаторы, листание пальцем
   ============================================================ */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ---------- 1. Слоты картинок ---------- */
  $$('.slot img').forEach(function (img) {
    var slot = img.closest('.slot');
    function ok() { if (img.naturalWidth > 0) slot.classList.add('is-loaded'); }
    function fail() { img.remove(); }
    if (img.complete) { img.naturalWidth > 0 ? ok() : fail(); }
    else {
      img.addEventListener('load', ok);
      img.addEventListener('error', fail);
    }
  });

  /* ---------- 4. Слайдеры ---------- */
  var SLIDE_MS = 4000;       // = --slide-time в tokens.css
  var MOVE_MS = 700;         // = --slide-move: смена слайда
  var RESUME_MS = 6000;      // после касания пальцем автопрокрутка ждёт столько

  function ease(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

  $$('.slider').forEach(function (slider) {
    var track = slider.querySelector('.slider__track');
    var dotsBox = slider.querySelector('.dots');
    var slides = track ? $$('.slider__slide', track) : [];
    var arrowsBox = slider.querySelector('.arrows');
    var stepCanvas = track && track.querySelector('.slider__canvas[data-steps]');
    if (arrowsBox && stepCanvas) return stepper(slider, stepCanvas, arrowsBox);
    if (!track || !dotsBox) return;
    // Лента со сдвигом на шаг (кейс ВЗР, «Рекомендации»): двигаем transform, а не прокрутку
    var canvas = track.querySelector('.slider__canvas[data-steps]');
    var flow = !!canvas;
    if (!slides.length && !flow) return legacy(slider, track);

    var items = [], dots = [], current = 0, tween = 0;
    var auto = slider.hasAttribute('data-autoplay') && !reduced;
    var state = { hover: false, focus: false, hidden: false, held: false };
    var holdTimer = 0, scrollTimer = 0;

    // На телефоне слайд «раскрыт» (display: contents) — листаем по одному айфону
    function getItems() {
      if (flow) return Array.apply(null, Array(+canvas.dataset.steps)).map(function (_, i) { return i; });
      return getComputedStyle(slides[0]).display === 'contents' ? $$('.slot', track) : slides;
    }

    function buildDots() {
      items = getItems();
      current = Math.min(current, items.length - 1);
      dotsBox.innerHTML = '';
      dots = items.map(function (_, n) {
        var b = document.createElement('button');
        b.className = 'dots__dot';
        b.type = 'button';
        b.setAttribute('aria-label', 'Слайд ' + (n + 1) + ' из ' + items.length);
        var f = document.createElement('span');
        f.className = 'dots__fill';
        b.appendChild(f);
        b.addEventListener('click', function () { hold(); go(n); });
        dotsBox.appendChild(b);
        return b;
      });
      paint(current);
      if (flow) { slider.dataset.step = current; canvas.style.setProperty('--step', current); }
      else track.scrollLeft = target(current);
    }

    function target(n) {
      var it = items[n];
      var left = it.offsetLeft + it.offsetWidth / 2 - track.clientWidth / 2;
      return Math.max(0, Math.min(left, track.scrollWidth - track.clientWidth));
    }

    function nearest() {
      var c = track.scrollLeft + track.clientWidth / 2, best = 0, bd = Infinity;
      items.forEach(function (it, n) {
        var d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - c);
        if (d < bd) { bd = d; best = n; }
      });
      return best;
    }

    // Отметить активную точку и запустить её отсчёт заново
    function paint(n) {
      current = n;
      dots.forEach(function (d, k) {
        if (k !== n) { d.removeAttribute('aria-current'); return; }
        d.setAttribute('aria-current', 'true');
        var f = d.firstChild;
        f.style.animation = 'none';
        void f.offsetWidth;
        f.style.animation = '';
      });
    }

    // Плавная смена слайда: своя анимация прокрутки, ease-in-out
    function go(n) {
      paint(n);
      if (flow) {
        slider.dataset.step = n;
        canvas.style.setProperty('--step', n);
        return;
      }
      var from = track.scrollLeft, to = target(n);
      cancelAnimationFrame(tween);
      if (reduced || Math.abs(to - from) < 1) { track.scrollLeft = to; return; }
      track.style.scrollSnapType = 'none';
      var t0 = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - t0) / MOVE_MS);
        track.scrollLeft = from + (to - from) * ease(p);
        if (p < 1) tween = requestAnimationFrame(step);
        else { tween = 0; track.style.scrollSnapType = ''; }
      })(t0);
    }

    function sync() {
      var paused = state.hover || state.focus || state.hidden || state.held || document.hidden;
      slider.classList.toggle('is-paused', paused);
    }

    // Человек сам листает: остановить отсчёт, потом продолжить
    function hold() {
      if (!auto) return;
      state.held = true; sync();
      clearTimeout(holdTimer);
      holdTimer = setTimeout(function () { state.held = false; paint(current); sync(); }, RESUME_MS);
    }

    if (auto) {
      slider.classList.add('is-auto');
      // Отсчёт активной точки закончился → следующий слайд, после последнего — первый
      dotsBox.addEventListener('animationend', function (e) {
        if (!e.target.classList.contains('dots__fill')) return;
        go((current + 1) % items.length);
      });
      slider.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { state.hover = true; sync(); } });
      slider.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { state.hover = false; sync(); } });
      slider.addEventListener('focusin', function () { state.focus = true; sync(); });
      slider.addEventListener('focusout', function () { state.focus = false; sync(); });
      track.addEventListener('pointerdown', hold, { passive: true });
      track.addEventListener('wheel', hold, { passive: true });
      document.addEventListener('visibilitychange', sync);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          state.hidden = !en[0].isIntersecting; sync();
        }, { threshold: 0.35 }).observe(slider);
      }
    }

    // Листают пальцем — точки следят за положением
    track.addEventListener('scroll', function () {
      if (tween || flow) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var n = nearest();
        if (n !== current) paint(n);
      }, 120);
    }, { passive: true });

    var mq = window.matchMedia('(max-width: 960px)');   // = граница слайдера «по одному айфону» в components.css
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () {
      requestAnimationFrame(buildDots);
    });
    window.addEventListener('resize', function () { if (!tween && !flow) track.scrollLeft = target(current); });

    buildDots();
    sync();
  });

  // Лента со стрелками «назад / вперёд»: листает человек, без автопрокрутки.
  // Сдвиг — тот же transform с плавной анимацией (case.css, .slider--flow)
  function stepper(slider, canvas, box) {
    var prev = box.querySelector('.arrows__btn--prev');
    var next = box.querySelector('.arrows__btn--next');
    var last = Math.max(0, +canvas.dataset.steps - 1);
    var current = 0;
    function go(n) {
      current = Math.max(0, Math.min(last, n));
      slider.dataset.step = current;
      canvas.style.setProperty('--step', current);
      prev.disabled = current === 0;
      next.disabled = current === last;
      // Кнопка в фокусе стала disabled — фокус переходит на соседнюю
      if (document.activeElement === prev && prev.disabled) next.focus();
      if (document.activeElement === next && next.disabled) prev.focus();
    }
    prev.addEventListener('click', function () { go(current - 1); });
    next.addEventListener('click', function () { go(current + 1); });
    go(0);
  }

  // Лента шире плашки (слайдер «Рекомендации» в кейсе): точки = доля прокрутки
  function legacy(slider, track) {
    var dots = $$('.dots__dot', slider);
    if (!dots.length) return;
    function max() { return track.scrollWidth - track.clientWidth; }
    function index() {
      var m = max();
      return m <= 0 ? 0 : Math.round(track.scrollLeft / m * (dots.length - 1));
    }
    function paint() {
      var i = index();
      dots.forEach(function (d, n) {
        if (n === i) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }
    dots.forEach(function (d, n) {
      d.addEventListener('click', function () {
        track.scrollTo({ left: max() * n / Math.max(1, dots.length - 1), behavior: reduced ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('scroll', function () { requestAnimationFrame(paint); }, { passive: true });
    paint();
  }

  /* ---------- 5. Клик по мокапам ведёт в кейс (только мышь) ---------- */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  $$('.case-card').forEach(function (card) {
    var link = card.querySelector('.case-card__info a.btn');
    var media = card.querySelector('.case-card__media');
    if (!link || !media || link.getAttribute('href') === '#') return;
    media.classList.add('is-link');
    var x0 = 0, y0 = 0;
    media.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; });
    media.addEventListener('click', function (e) {
      if (!finePointer.matches || e.target.closest('.dots')) return;
      if (Math.abs(e.clientX - x0) > 6 || Math.abs(e.clientY - y0) > 6) return;   // это было перетаскивание
      link.click();
    });
  });

  /* ---------- 6. Плавный переход между страницами ----------
     Основной способ — View Transitions в CSS (base.css): браузер сам
     растворяет одну страницу в другую, парящее меню стоит на месте.
     Где их нет (Firefox, файлы открыты с диска) — простой fade. */
  var nativeVT = 'CSSViewTransitionRule' in window && location.protocol !== 'file:';
  if (!nativeVT && !reduced) {
    var root = document.documentElement;
    root.classList.add('pt-enter');
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) root.classList.remove('pt-leave');
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download') || a.protocol !== location.protocol || a.host !== location.host) return;
      if (a.pathname === location.pathname) return;          // якорь на этой же странице
      e.preventDefault();
      root.classList.add('pt-leave');
      setTimeout(function () { location.href = a.href; }, 200);
    });
  }

  /* ---------- 7. Возврат из кейса ----------
     Кнопка «Вернуться» (js/case.js) запоминает кейс; главная открывается
     сверху и плавно доезжает до его карточки. */
  var backTo = null;
  try { backTo = sessionStorage.getItem('backTo'); sessionStorage.removeItem('backTo'); } catch (err) {}
  var card = backTo && document.getElementById(backTo);
  if (card) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(function () {
      var r = card.getBoundingClientRect();
      var top = window.scrollY + r.top - Math.max(window.innerHeight - r.height, 0) / 2;
      window.scrollTo({ top: Math.max(top, 0), behavior: reduced ? 'auto' : 'smooth' });
    }, reduced ? 0 : 450);
  }

})();
