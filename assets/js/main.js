'use strict';

/**
 * Every block below is one independent enhancement — the video hero, the
 * scroll reveal, the back-to-top button. None of them needs another, and none
 * of them is the page: the page is complete before this file loads. So an
 * error in one must not take the others with it, which is what a bare
 * exception at the top level of a script does — it stops the file. guard()
 * runs each block on its own and reports rather than aborts.
 */
function guard(fn) {
  try { fn(); }
  catch (err) { if (window.console && console.error) console.error('main.js:', err); }
}

/**
 * The only script on the site: rotating the home-page video hero.
 *
 * Without it the first clip simply loops — the markup carries autoplay muted
 * loop playsinline, and that is a complete hero on its own. With it, the clips
 * rotate: each crossfades into the next a moment before it ends. Two <video>
 * elements alternate so the fade is a real overlap, not a cut.
 *
 * It stands down whenever motion is unwanted or costly — prefers-reduced-motion,
 * a data-saver connection, autoplay refused by the browser, the tab hidden, the
 * hero scrolled out of view. In every one of those the poster is the hero.
 */
guard(function () {
  var hero = document.querySelector('[data-hero-video]');
  if (!hero) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  if (reduce || conn.saveData) return;                 // poster only, on purpose

  var clips = (hero.getAttribute('data-clips') || '').split(' ').filter(Boolean);
  var videos = hero.querySelectorAll('.hero__video');
  if (clips.length < 2 || videos.length < 2) return;   // one clip: the loop attribute already does it

  var a = videos[0], b = videos[1];
  var active = a, idle = b, cur = 0, armed = false;
  var LEAD = 0.9;                                      // seconds before the end to begin the fade

  a.removeAttribute('loop');

  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  function swap() {
    cur = (cur + 1) % clips.length;
    idle.src = clips[cur];
    idle.load();
    play(idle);
    idle.classList.add('is-active');
    active.classList.remove('is-active');
    var t = active; active = idle; idle = t;
    armed = false;
  }

  function tick() {
    if (armed || !active.duration) return;
    if (active.duration - active.currentTime <= LEAD) { armed = true; swap(); }
  }
  function ended() { if (this === active && !armed) swap(); }

  a.addEventListener('timeupdate', tick);
  b.addEventListener('timeupdate', tick);
  a.addEventListener('ended', ended);
  b.addEventListener('ended', ended);

  // If the browser refuses autoplay the poster is already on screen; nothing to do.
  play(a);

  // Fetch the second clip only once the first is actually playing.
  a.addEventListener('playing', function warm() {
    a.removeEventListener('playing', warm);
    b.preload = 'auto';
    b.src = clips[1 % clips.length];
    b.load();
  });

  function pauseAll() { a.pause(); b.pause(); }
  function resume() { play(active); }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseAll(); else resume();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) resume(); else pauseAll();
    }, { threshold: 0.1 }).observe(hero);
  }
});

/**
 * Section reveal on scroll.
 *
 * Both halves of the effect are added here and nowhere else: `js-reveal` on
 * <html> arms the stylesheet, and `reveal` marks each block. So with this
 * script absent, blocked, or stopped by an error above this line, no selector
 * in main.css matches and every section renders exactly as it always did. The
 * page cannot end up with content hidden by a transition that never ran.
 *
 * It stands down entirely for prefers-reduced-motion — the CSS neutralises it
 * too, belt and braces.
 *
 * Only blocks that begin below the fold are armed. Anything already on screen
 * at load is left alone, so the first paint is the finished page rather than a
 * fade-in of what the visitor is already looking at.
 *
 * A rAF-throttled scroll sweep, not an IntersectionObserver. An observer only
 * fires on a threshold crossing, and a jump — End, a scrollbar drag, a restored
 * scroll position — takes a block from "below the fold" to "above the fold"
 * without it ever intersecting, so no callback arrives and the block stays
 * invisible. The sweep asks the only question that matters (is it above the
 * fold line yet?) and cannot miss. It runs at most once a frame over at most a
 * handful of elements, and unbinds itself the moment the last one is revealed.
 */
guard(function () {
  if (!window.requestAnimationFrame) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var blocks = document.querySelectorAll('.sec, .band, .statement, .artwork');
  if (!blocks.length) return;

  var fold = window.innerHeight || document.documentElement.clientHeight;
  var pending = [];
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].getBoundingClientRect().top > fold * 0.9) pending.push(blocks[i]);
  }
  if (!pending.length) return;

  document.documentElement.classList.add('js-reveal');
  for (var j = 0; j < pending.length; j++) pending[j].classList.add('reveal');

  var ticking = false;

  function reveal(el) { el.classList.add('is-in'); }

  function stop() {
    window.removeEventListener('scroll', request);
    window.removeEventListener('resize', request);
  }

  function sweep() {
    ticking = false;
    var h = window.innerHeight || document.documentElement.clientHeight;
    var line = h * 0.88;                       // a little before the bottom edge
    var rest = [];
    for (var k = 0; k < pending.length; k++) {
      if (pending[k].getBoundingClientRect().top < line) reveal(pending[k]);
      else rest.push(pending[k]);
    }
    pending = rest;
    if (!pending.length) stop();
  }

  function request() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(sweep);
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  request();

  // Last resort. If the sweep somehow never runs, everything is visible a few
  // seconds in. The reveal is decoration; the content is not negotiable.
  setTimeout(function () {
    for (var n = 0; n < pending.length; n++) reveal(pending[n]);
    pending = [];
    stop();
  }, 4000);
});

/**
 * Back to top.
 *
 * The markup already carries a working in-page link at the foot of the page.
 * This lifts it into the corner as a floating button, and shows it only once
 * the visitor is a screen or so down — before that there is nothing above them
 * to go back to, and a button that is always there is just clutter.
 *
 * As with the reveal, the arming class and the state class are both added
 * here, so with JavaScript off, blocked, or still parsing, the CSS in main.css
 * never matches and the link is exactly what it appears to be in the footer.
 *
 * The click is intercepted only to make the scroll smooth. Everything the
 * browser would have done for a plain #top link is then done by hand: the
 * focus moves to the header, so a keyboard user's next Tab starts from the top
 * of the page rather than from the footer they were standing in. Without that
 * the button moves the view and abandons the keyboard, which is worse than not
 * having it. preventScroll keeps focus() from jumping the page and cancelling
 * the animation it was asked to smooth.
 */
guard(function () {
  var btn = document.querySelector('.totop');
  if (!btn || !window.requestAnimationFrame) return;

  var target = document.querySelector(btn.getAttribute('href'));
  if (!target) return;

  document.documentElement.classList.add('js-totop');

  // Measure the sticky action bar rather than guessing at it, so the button
  // clears it whatever the label inside it grows to — and re-measure on
  // resize, because the bar only exists under 640px and its height changes
  // when a label wraps.
  var bar = document.querySelector('.actionbar');
  function measureBar() {
    if (!bar) return;
    var h = Math.round(bar.getBoundingClientRect().height);
    if (h) document.documentElement.style.setProperty('--actionbar-h', h + 'px');
  }
  measureBar();

  var shown = false, ticking = false;

  function sweep() {
    ticking = false;
    measureBar();
    var want = window.pageYOffset > (window.innerHeight || 0) * 1.2;
    if (want === shown) return;
    shown = want;
    btn.classList.toggle('is-in', want);
  }

  function request() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(sweep);
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  request();

  btn.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    } catch (err) {
      window.scrollTo(0, 0);                       // older browsers: no options object
    }
    try {
      target.focus({ preventScroll: true });
    } catch (err) {
      target.focus();
    }
  });
});

/**
 * Cookie consent — for the one thing on this site that sets any: the map.
 *
 * The site itself stores nothing and calls nobody. The Google Maps embed
 * does both, so it is not in the markup; each map is a panel with a link,
 * and this block swaps the iframe in only after a yes. A yes can come from
 * the banner, from the buttons on /cookies/, or from the panel's own button —
 * the same consent, given in context.
 *
 * The choice lives in localStorage under the key the banner carries, with
 * the time it was made, and is treated as expired after the number of months
 * the banner carries (six: the ICO's own worked example). Storing the choice
 * is the one thing this site ever writes to a visitor's browser, and it is
 * exempt from consent because it IS the record of consent.
 *
 * The banner shows only on a page that has a map and only while no valid
 * choice is stored: asking on the menu page about a cookie the menu page
 * cannot set would be noise. It is not a modal and takes no focus.
 */
guard(function () {
  var banner = document.querySelector('.consent');
  if (!banner) return;
  var KEY = banner.getAttribute('data-consent-key') || 'pookie:consent';
  var MONTHS = parseInt(banner.getAttribute('data-consent-months'), 10) || 6;
  var MAX_AGE = MONTHS * 30.44 * 86400000;
  var maps = document.querySelectorAll('[data-map]');
  var root = document.documentElement;

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (!v || typeof v.at !== 'number') return null;
      if (Date.now() - v.at > MAX_AGE) return null;          // expired: ask again
      return { maps: !!v.maps, at: v.at };
    } catch (e) { return null; }                             // private mode, blocked storage
  }
  function write(maps) {
    try { localStorage.setItem(KEY, JSON.stringify({ maps: !!maps, at: Date.now() })); } catch (e) {}
  }

  function loadMap(fig) {
    var ask = fig.querySelector('.map__ask');
    var src = fig.getAttribute('data-map-embed');
    if (!ask || !src) return;
    var frame = document.createElement('iframe');
    frame.className = 'map__frame';
    frame.src = src;
    frame.title = fig.getAttribute('data-map-title') || 'Map';
    frame.loading = 'lazy';
    frame.setAttribute('allowfullscreen', '');
    ask.parentNode.replaceChild(frame, ask);
  }
  function loadMaps() { for (var i = 0; i < maps.length; i++) loadMap(maps[i]); }

  function show() { banner.hidden = false; root.classList.add('has-consent'); }
  function hide() { banner.hidden = true; root.classList.remove('has-consent'); }

  function status() {
    var el = document.querySelector('[data-consent-status]');
    if (!el) return;
    var c = read();
    el.textContent = !c ? 'You have not chosen yet, or the choice has expired.'
      : c.maps ? 'Your current choice: the map may load.'
      : 'Your current choice: the map stays a link.';
  }

  function decide(yes) {
    write(yes);
    hide();
    if (yes) loadMaps();
    status();
  }

  // Buttons: on the banner and on /cookies/.
  var buttons = document.querySelectorAll('[data-consent]');
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].addEventListener('click', function () {
      decide(this.getAttribute('data-consent') === 'yes');
    });
  }

  // The panel's own button: it is a link in the HTML so that it works without
  // this script; with it, pressing it is a yes, given in context.
  for (var m = 0; m < maps.length; m++) {
    (function (fig) {
      var ask = fig.querySelector('.map__ask');
      if (!ask) return;
      ask.setAttribute('role', 'button');
      ask.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;   // let "open in new tab" be that
        e.preventDefault();
        decide(true);
      });
    })(maps[m]);
  }

  var choice = read();
  if (choice && choice.maps) loadMaps();
  else if (!choice && maps.length) show();
  status();
});
