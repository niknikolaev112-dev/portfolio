/* ============================================================
   Видео на странице — без библиотек.

   Что делает:
   1. Автоплей только когда ролик в зоне видимости (IntersectionObserver).
      За экраном видео стоит на паузе — экономит трафик и батарею.
   2. Ленивая загрузка: у <video data-src="..."> файл начинает качаться,
      только когда блок подъезжает к экрану.
   3. Медленная сеть или «экономия трафика» (2G/3G, Save-Data) — ролик
      не качается сам: видна обложка (poster) и кнопка play. Нажал —
      скачался и запустился.
      Safari и Firefox скорость сети не сообщают, поэтому проверяем и на деле:
      ролик не пошёл или завис на 4 с — загрузка отменяется, возвращается
      обложка, а остальные ролики до закрытия вкладки сами не качаются.
   4. Кнопка play/pause в углу — с мыши и с клавиатуры.
   5. Системная настройка «уменьшить движение» — автоплея нет,
      человек запускает ролик сам.
   6. Заглушка с именем файла (.is-empty) исчезает, как только
      загрузилась обложка или первый кадр ролика.

   Подключение: <script src="js/video.js" defer></script>
   ============================================================ */

(function () {
  'use strict';

  var wraps = document.querySelectorAll('.video');
  if (!wraps.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var slowNet = !!(conn && (conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '')));
  var SLOW_KEY = 'video-slow';   // сеть уже оказалась медленной: на других страницах не пробуем
  var LIMIT = 4000;              // сколько ждём, пока ролик пойдёт или отвиснет
  try { slowNet = slowNet || sessionStorage.getItem(SLOW_KEY) === '1'; } catch (e) {}
  var autoAllowed = !reduced && !slowNet;
  var preloader, io;

  function setState(wrap, video) {
    wrap.classList.toggle('is-paused', video.paused);
    var btn = wrap.querySelector('.video__toggle');
    if (btn) btn.setAttribute('aria-label', video.paused ? 'Воспроизвести' : 'Пауза');
  }

  function ready(wrap) { wrap.classList.remove('is-empty'); }

  // Подставляет файл из data-src (один раз)
  function attach(video) {
    if (!video.dataset.src || video.getAttribute('src')) return;
    video.src = video.dataset.src;
    video.preload = 'auto';
    video.load();
  }

  function play(video) {
    attach(video);
    if (video.readyState < 3) arm(video);
    var p = video.play();
    if (p && p.catch) p.catch(function () { disarm(video); /* браузер запретил автоплей — ок */ });
  }

  // Отсчёт: за LIMIT ролик не заиграл — сеть медленная. Запущенное вручную не трогаем.
  // В скрытой вкладке браузер сам придерживает видео — это не про сеть
  function arm(video) {
    disarm(video);
    if (video.dataset.manual === '1') return;
    video.slowTimer = setTimeout(function () {
      if (!document.hidden) goSlow(video);
    }, LIMIT);
  }

  function disarm(video) { clearTimeout(video.slowTimer); }

  // Отменяет загрузку: без файла браузер снова показывает обложку
  function stop(video) {
    disarm(video);
    video.pause();
    video.removeAttribute('src');
    video.load();
  }

  function goSlow(stuck) {
    autoAllowed = false;
    try { sessionStorage.setItem(SLOW_KEY, '1'); } catch (e) {}
    if (preloader) preloader.disconnect();
    if (io) io.disconnect();
    wraps.forEach(function (wrap) {
      var video = wrap.querySelector('video');
      if (!video || !video.dataset.src || video.dataset.manual === '1') return;
      if (video === stuck || video.paused) stop(video);   // ролик, который идёт без сбоев, не обрываем
    });
  }

  wraps.forEach(function (wrap) {
    var video = wrap.querySelector('video');
    if (!video) return;

    // Автоплей работает только у беззвучного видео — страхуемся.
    if (video.hasAttribute('autoplay') || video.hasAttribute('data-autoplay-in-view')) video.muted = true;

    if (!autoAllowed) {
      video.removeAttribute('autoplay');
      video.pause();
    }

    // Обложка загрузилась — убираем заглушку
    if (video.poster) {
      var img = new Image();
      img.onload = function () { ready(wrap); };
      img.src = video.poster;
    }
    video.addEventListener('loadeddata', function () { ready(wrap); });
    video.addEventListener('error', function () { wrap.classList.add('is-failed'); }, true);

    var btn = wrap.querySelector('.video__toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        if (video.paused) {
          video.dataset.userPaused = '0';
          video.dataset.manual = '1';
          play(video);
        } else {
          video.dataset.userPaused = '1';
          video.pause();
        }
      });
    }

    video.addEventListener('play', function () { setState(wrap, video); });
    video.addEventListener('pause', function () { disarm(video); setState(wrap, video); });
    video.addEventListener('playing', function () { disarm(video); });
    video.addEventListener('waiting', function () { if (!video.paused) arm(video); });
    setState(wrap, video);
  });

  if (!autoAllowed || !('IntersectionObserver' in window)) return;

  // Заранее подгружаем файл, когда до блока остаётся ~экран
  preloader = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      attach(entry.target);
      preloader.unobserve(entry.target);
    });
  }, { rootMargin: '100% 0px' });

  io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var video = entry.target;
      if (video.dataset.userPaused === '1') return;   // не перебиваем ручную паузу
      if (entry.isIntersecting) play(video);
      else video.pause();
    });
  }, { threshold: 0.25 });

  document.querySelectorAll('video[data-autoplay-in-view]').forEach(function (video) {
    if (video.dataset.src) preloader.observe(video);
    io.observe(video);
  });
})();
