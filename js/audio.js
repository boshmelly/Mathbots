/* Gentle sound effects synthesised with the Web Audio API (no audio files).
 * If audio is unavailable or fails, every call silently does nothing. */
(function () {
  'use strict';
  var ctx = null;
  var master = null;
  var muted = false;
  var broken = false;

  function ensure() {
    if (broken || muted) return null;
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { broken = true; return null; }
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.16; // quiet on purpose
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { broken = true; return null; }
  }

  // One soft note with a short fade in/out (no clicks, nothing startling).
  function note(freq, start, dur, type, vol) {
    var c = ensure();
    if (!c) return;
    try {
      var t0 = c.currentTime + start;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.6, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* stay silent */ }
  }

  function slide(f1, f2, dur, type, vol) {
    var c = ensure();
    if (!c) return;
    try {
      var t0 = c.currentTime;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f1, t0);
      o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* stay silent */ }
  }

  var sounds = {
    coin: function () { note(988, 0, 0.08, 'triangle', 0.5); note(1319, 0.06, 0.14, 'triangle', 0.5); },
    jump: function () { slide(330, 520, 0.12, 'sine', 0.25); },
    correct: function () { note(523, 0, 0.14, 'triangle'); note(659, 0.1, 0.14, 'triangle'); note(784, 0.2, 0.26, 'triangle'); },
    wrong: function () { note(392, 0, 0.18, 'sine', 0.35); note(330, 0.16, 0.26, 'sine', 0.35); },
    bonk: function () { slide(420, 180, 0.25, 'sine', 0.35); },
    checkpoint: function () { note(660, 0, 0.1, 'sine', 0.4); note(880, 0.09, 0.18, 'sine', 0.4); },
    gate: function () { slide(200, 400, 0.35, 'triangle', 0.3); },
    click: function () { note(700, 0, 0.05, 'sine', 0.2); },
    complete: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { note(f, i * 0.13, 0.22, 'triangle', 0.5); });
      note(784, 0.6, 0.18, 'triangle', 0.45); note(1047, 0.75, 0.5, 'triangle', 0.55);
    }
  };

  var Audio = {
    play: function (name) {
      if (muted || broken || !sounds[name]) return;
      try { sounds[name](); } catch (e) { /* silent */ }
    },
    setMuted: function (m) {
      muted = !!m;
      try { if (ctx && muted && ctx.state === 'running') ctx.suspend(); } catch (e) { /* ignore */ }
    },
    isMuted: function () { return muted; },
    unlock: function () { ensure(); }, // call from a click/keypress
    isAvailable: function () { return !broken; }
  };

  (window.MB = window.MB || {}).Audio = Audio;
})();
