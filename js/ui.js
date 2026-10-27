/* DOM helpers: screens, focus, teddy speech, toasts and small canvas portraits. */
(function () {
  'use strict';
  var Render = window.MB.Render;
  var $ = function (id) { return document.getElementById(id); };
  var current = null;
  var teddyTimer = 0;
  var toastTimer = 0;

  var SCREENS = ['title', 'missions', 'controls', 'settings', 'grownups', 'tutorial', 'pause', 'challenge', 'complete', 'confirm'];

  function show(name, focusId) {
    SCREENS.forEach(function (s) { $('screen-' + s).classList.toggle('hidden', s !== name); });
    current = name;
    if (name) focusFirst(focusId);
  }

  function focusFirst(focusId) {
    var el = focusId ? $(focusId) : null;
    if (!el && current) el = $('screen-' + current).querySelector('button:not([disabled])');
    if (el) setTimeout(function () { el.focus(); }, 30);
  }

  function currentScreen() { return current; }

  // Arrow keys move focus between buttons on the open screen.
  function moveFocus(dir) {
    if (!current) return false;
    var btns = Array.prototype.slice.call($('screen-' + current).querySelectorAll('button:not([disabled])'))
      .filter(function (b) { return b.offsetParent !== null; });
    if (!btns.length) return false;
    var i = btns.indexOf(document.activeElement);
    i = i === -1 ? 0 : (i + dir + btns.length) % btns.length;
    btns[i].focus();
    return true;
  }

  function teddySay(text, seconds) {
    $('teddy-text').textContent = text;
    $('teddy').classList.remove('hidden');
    teddyTimer = seconds || 5;
  }
  function teddyHide() { $('teddy').classList.add('hidden'); teddyTimer = 0; }

  function toast(text, seconds) {
    var el = $('toast');
    el.textContent = text;
    el.classList.remove('hidden');
    toastTimer = seconds || 2;
  }

  function tick(dt) {
    if (teddyTimer > 0) { teddyTimer -= dt; if (teddyTimer <= 0) teddyHide(); }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.add('hidden'); }
  }

  // Small character portraits on their own canvases.
  function portrait(canvasId, who, opts) {
    var c = $(canvasId);
    if (!c) return;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    opts = opts || {};
    var s = c.width / 100;
    ctx.save();
    ctx.scale(s, s);
    if (who === 'hero-head') {
      ctx.translate(50, 140); ctx.scale(1.25, 1.25);
      Render.drawHero(ctx, 0, 0, { facing: 1, t: opts.t || 0, happy: true });
    } else if (who === 'hero') {
      ctx.translate(50, 96); ctx.scale(0.95, 0.95);
      Render.drawHero(ctx, 0, 0, { facing: 1, t: opts.t || 0, win: opts.win, happy: true });
    } else {
      ctx.translate(50, 94); ctx.scale(1.15, 1.15);
      Render.drawTeddy(ctx, 0, 0, { facing: 1, t: opts.t || 0, cheer: opts.cheer, noShadow: true });
    }
    ctx.restore();
  }

  // Groups picture for the kind explanation: `a` rows of `b` footballs.
  function drawArray(canvasId, a, b) {
    var c = $(canvasId);
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    var pad = 10;
    var cell = Math.min((c.width - pad * 2 - 70) / b, (c.height - pad * 2) / a, 44);
    var r = cell * 0.36;
    var w = b * cell, h = a * cell;
    var ox = (c.width - w - 60) / 2 + 60, oy = (c.height - h) / 2;
    for (var row = 0; row < a; row++) {
      var y = oy + row * cell;
      ctx.fillStyle = row % 2 ? '#e8f4ff' : '#fff6d6';
      ctx.strokeStyle = '#1b1b2f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(ox - 4, y + 1, w + 8, cell - 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b1b2f';
      ctx.font = 'bold ' + Math.max(11, Math.min(18, cell * 0.6)) + 'px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String((row + 1) * b), ox - 10, y + cell * 0.68);
      for (var col = 0; col < b; col++) {
        Render.drawFootball(ctx, ox + col * cell + cell / 2, y + cell / 2, r, 0);
      }
    }
  }

  // Press-and-hold button (mouse or keyboard) for grown-up areas.
  function holdButton(el, ms, onDone) {
    var fill = el.querySelector('.hold-fill');
    var start = 0, raf = 0;
    function frame() {
      var p = Math.min(1, (performance.now() - start) / ms);
      fill.style.width = (p * 100) + '%';
      if (p >= 1) { stop(); onDone(); } else raf = requestAnimationFrame(frame);
    }
    function begin(e) { if (e && e.repeat) return; if (start) return; start = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { start = 0; cancelAnimationFrame(raf); fill.style.width = '0'; }
    el.addEventListener('pointerdown', begin);
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointerleave', stop);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); begin(e); } });
    el.addEventListener('keyup', stop);
    el.addEventListener('blur', stop);
    el.addEventListener('click', function (e) { e.preventDefault(); });
  }

  function setToggle(el, label, on) {
    el.textContent = label + ': ' + (on ? 'On' : 'Off');
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  window.MB.UI = {
    $: $, show: show, currentScreen: currentScreen, focusFirst: focusFirst, moveFocus: moveFocus,
    teddySay: teddySay, teddyHide: teddyHide, toast: toast, tick: tick,
    portrait: portrait, drawArray: drawArray, holdButton: holdButton, setToggle: setToggle
  };
})();
