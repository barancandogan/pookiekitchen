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
