/**
 * AdRotator Web SDK v1.0
 *
 * Использование:
 *   <script src="https://your-adserver.com/sdk/ad.js" data-server="https://your-adserver.com"></script>
 *   <div data-ad-zone="ZONE_KEY" data-ad-width="300" data-ad-height="250"></div>
 *
 * Или программно:
 *   AdRotator.init({ server: 'https://your-adserver.com' });
 *   AdRotator.load('ZONE_KEY', document.getElementById('banner'));
 */
(function (window, document) {
  'use strict';

  var SDK_VERSION = '1.0.0';
  var SERVER = '';

  // Определить сервер из атрибута скрипта
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var s = scripts[i];
    if (s.getAttribute('data-server')) {
      SERVER = s.getAttribute('data-server').replace(/\/$/, '');
      break;
    }
    // Автоопределение по src
    if (s.src && s.src.indexOf('/sdk/ad.js') !== -1) {
      var url = new URL(s.src);
      SERVER = url.origin;
    }
  }

  function createBanner(ad, container) {
    if (!ad || (!ad.image_url && !ad.html_content)) {
      return;
    }

    var wrapper = document.createElement('div');
    wrapper.className = 'adrotator-banner';
    wrapper.style.cssText = 'display:inline-block;overflow:hidden;line-height:0;';

    if (ad.type === 'html' && ad.html_content) {
      wrapper.innerHTML = ad.html_content;
    } else if (ad.image_url) {
      var link = document.createElement('a');
      link.href = SERVER + '/api/track/click/' + ad.id + '?zone=' + encodeURIComponent(ad.zone) + '&redirect=' + encodeURIComponent(ad.click_url || '');
      link.target = '_blank';
      link.rel = 'noopener noreferrer sponsored';
      link.style.cssText = 'display:block;line-height:0;';

      var img = document.createElement('img');
      // Если URL начинается с /, добавляем сервер
      img.src = ad.image_url.charAt(0) === '/' ? SERVER + ad.image_url : ad.image_url;
      img.width = ad.width;
      img.height = ad.height;
      img.alt = '';
      img.style.cssText = 'display:block;border:0;max-width:100%;height:auto;';

      link.appendChild(img);
      wrapper.appendChild(link);
    }

    container.appendChild(wrapper);

    // Трекинг показа (пиксель)
    var pixel = new Image();
    pixel.src = SERVER + '/api/track/impression/' + ad.id + '?p=' + (ad.placement_id || '') + '&t=' + Date.now();

    // Видимый показ (MRC: ≥50% в viewport ≥1 сек) — киллер-фича vs конкуренты
    if (typeof IntersectionObserver !== 'undefined' && ad.placement_id) {
      var viewableSent = false;
      var viewableTimer = null;
      var isVisible = false;
      var io = new IntersectionObserver(
        function (entries) {
          if (viewableSent) return;
          var e = entries[0];
          isVisible = e.isIntersecting;
          if (isVisible && !viewableTimer) {
            viewableTimer = setTimeout(function () {
              if (viewableSent || !isVisible) return;
              viewableSent = true;
              if (io) io.disconnect();
              var v = new Image();
              v.src = SERVER + '/api/track/viewable/' + ad.id + '?p=' + ad.placement_id + '&t=' + Date.now();
            }, 1000);
          }
          if (!isVisible && viewableTimer) {
            clearTimeout(viewableTimer);
            viewableTimer = null;
          }
        },
        { threshold: 0.5 }
      );
      io.observe(wrapper);
    }
  }

  function getUid() {
    try {
      var k = 'ar_uid';
      if (localStorage.getItem(k)) return localStorage.getItem(k);
      var u = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(k, u);
      return u;
    } catch (e) {
      return '';
    }
  }

  function loadZone(zoneKey, element) {
    var xhr = new XMLHttpRequest();
    var uid = getUid();
    var url = SERVER + '/api/serve/' + encodeURIComponent(zoneKey) + (uid ? '?uid=' + encodeURIComponent(uid) : '');
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var ad = JSON.parse(xhr.responseText);
            createBanner(ad, element);
          } catch (e) {
            // Ошибка парсинга — молча игнорируем
          }
        }
      }
    };
    xhr.send();
  }

  function scanAndLoad() {
    var zones = document.querySelectorAll('[data-ad-zone]');
    for (var i = 0; i < zones.length; i++) {
      var el = zones[i];
      // Пропустить если уже загружен
      if (el.getAttribute('data-ad-loaded')) continue;
      el.setAttribute('data-ad-loaded', '1');

      var zoneKey = el.getAttribute('data-ad-zone');
      if (zoneKey) {
        loadZone(zoneKey, el);
      }
    }
  }

  // Публичный API
  var AdRotator = {
    version: SDK_VERSION,
    server: SERVER,

    init: function (options) {
      if (options && options.server) {
        SERVER = options.server.replace(/\/$/, '');
        AdRotator.server = SERVER;
      }
    },

    load: function (zoneKey, element) {
      if (!element || !zoneKey) return;
      loadZone(zoneKey, element);
    },

    refresh: function () {
      // Удалить пометки и перезагрузить
      var zones = document.querySelectorAll('[data-ad-zone]');
      for (var i = 0; i < zones.length; i++) {
        zones[i].removeAttribute('data-ad-loaded');
        zones[i].innerHTML = '';
      }
      scanAndLoad();
    },
  };

  window.AdRotator = AdRotator;

  // Автозагрузка при готовности DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndLoad);
  } else {
    scanAndLoad();
  }

  // MutationObserver для SPA (новые элементы)
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) {
          scanAndLoad();
          return;
        }
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})(window, document);
