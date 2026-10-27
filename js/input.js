/* Keyboard and on-screen button input. Arrows/A/D move, Space/Up/W jump. */
(function () {
  'use strict';
  var held = { left: false, right: false, jump: false };
  var virtual = { left: false, right: false, jump: false };
  var jumpQueued = false;
  var listeners = [];

  var KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump'
  };

  function onKey(e, down) {
    var act = KEYMAP[e.code];
    if (act && Input.enabled) {
      if (act === 'jump' && down && !held.jump) jumpQueued = true;
      held[act] = down;
      e.preventDefault();
    }
    if (down) listeners.forEach(function (fn) { fn(e); });
  }

  window.addEventListener('keydown', function (e) { onKey(e, true); });
  window.addEventListener('keyup', function (e) { onKey(e, false); });
  window.addEventListener('blur', function () { Input.clear(); });

  var Input = {
    enabled: true,
    // Snapshot for one physics step.
    read: function () {
      var s = {
        left: held.left || virtual.left,
        right: held.right || virtual.right,
        jumpHeld: held.jump || virtual.jump,
        jumpPressed: jumpQueued
      };
      jumpQueued = false;
      return s;
    },
    clear: function () {
      held.left = held.right = held.jump = false;
      virtual.left = virtual.right = virtual.jump = false;
      jumpQueued = false;
    },
    setVirtual: function (act, down) {
      if (act === 'jump' && down && !virtual.jump) jumpQueued = true;
      virtual[act] = down;
    },
    onKeyDown: function (fn) { listeners.push(fn); },
    // Hook pointer-driven buttons (mouse or touch) to an action.
    bindButton: function (el, act) {
      function down(e) { e.preventDefault(); Input.setVirtual(act, true); }
      function up(e) { e.preventDefault(); Input.setVirtual(act, false); }
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointerleave', up);
      el.addEventListener('pointercancel', up);
    }
  };

  (window.MB = window.MB || {}).Input = Input;
})();
