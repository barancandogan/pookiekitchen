'use strict';

/**
 * The only script on the site. Everything here is an enhancement — with
 * JavaScript disabled every word on every page is still readable, and the
 * theme falls back to the visitor's system preference.
 */

(function () {
  var root = document.documentElement;
  var KEY = 'pookie-theme';

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function currentIsDark() {
    var explicit = root.getAttribute('data-theme');
    if (explicit === 'dark') return true;
    if (explicit === 'light') return false;
    return systemPrefersDark();
  }

  function paintLabel(btn) {
    var label = btn.querySelector('[data-theme-label]');
    if (!label) return;
    var dark = currentIsDark();
    // The button says what it will do, not what the page currently is.
    label.textContent = dark ? 'Light' : 'Dark';
    btn.setAttribute('aria-label', dark ? 'Switch to the light theme' : 'Switch to the dark theme');
  }

  var toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return;

  paintLabel(toggle);

  toggle.addEventListener('click', function () {
    var next = currentIsDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) { /* private mode */ }
    paintLabel(toggle);
  });

  // Follow the system if the visitor never made an explicit choice.
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () { if (!stored()) paintLabel(toggle); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
})();
