'use strict';

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
(function () {
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
})();

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
(function () {
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
}());

/**
 * The map, loaded on request and not before.
 *
 * The markup ships a link to openstreetmap.org. This upgrades it into a button
 * that swaps in the OSM iframe in place. So:
 *
 *   JavaScript off  the link works, opens the map in a new tab, nothing lost
 *   JavaScript on   one click and the map appears inline, still nothing sent
 *                   to openstreetmap.org until that click
 *
 * That ordering is the whole point. This site otherwise makes ZERO third-party
 * requests, and an iframe in the HTML would hand every visitor's IP address to
 * a third party on every page view — including the great majority who never
 * look at the map — on a site with no cookie banner and nowhere to record a
 * choice. One click is a choice. The label says where it loads from before it
 * is pressed.
 *
 * Focus moves into the map once it is there, so a keyboard user who pressed
 * the button is not left where the button used to be. `sandbox` is deliberately
 * NOT set: OSM's embed needs scripts to pan and zoom, and a sandbox permissive
 * enough to allow that buys nothing over the origin isolation an iframe has
 * anyway. `referrerpolicy` keeps our URL out of their logs.
 */
(function () {
  var figs = document.querySelectorAll('[data-map]');
  for (var i = 0; i < figs.length; i++) arm(figs[i]);

  function arm(fig) {
    var src = fig.getAttribute('data-map-embed');
    var ask = fig.querySelector('.map__ask');
    if (!src || !ask) return;

    // It is a link in the HTML so it works without this script. Now that the
    // script is running it does something else, so it must SAY something else
    // to anything that reads roles rather than pixels.
    ask.setAttribute('role', 'button');

    ask.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;  // let "open in new tab" be that
      e.preventDefault();

      var frame = document.createElement('iframe');
      frame.className = 'map__frame';
      frame.src = src;
      frame.title = 'Map of 61 Chapel Market, London N1 9ER, on OpenStreetMap';
      frame.loading = 'lazy';
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.setAttribute('tabindex', '0');

      ask.parentNode.replaceChild(frame, ask);
      frame.focus();
    });
  }
}());
