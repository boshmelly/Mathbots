/* Platformer physics: run, jump (with coyote time, jump buffering and
 * variable height), gravity, solid blocks, one-way platforms and moving
 * platforms that carry the player. Pure functions so tests can drive them. */
(function () {
  'use strict';
  var isNode = typeof module === 'object' && module.exports && typeof window === 'undefined';

  var P = {
    gravity: 2200, maxFall: 1100,
    runSpeed: 330, accelGround: 2600, accelAir: 1700, friction: 3200,
    jumpVel: 820, jumpCut: 0.45, coyote: 0.1, buffer: 0.13,
    w: 44, h: 76
  };

  function createPlayer(x, surfaceY) {
    return {
      x: x, y: surfaceY - P.h, w: P.w, h: P.h, vx: 0, vy: 0,
      onGround: true, coyote: 0, jumpBuf: 0, jumpHeld: false, facing: 1,
      groundRef: null, landTimer: 0, airTime: 0
    };
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Move the moving platforms; records how far each moved this step.
  function updateMovers(movers, dt) {
    movers.forEach(function (m) {
      m.t += dt;
      var off = (Math.sin(m.t * m.speed * 2) * 0.5 + 0.5) * m.range;
      var nx = m.axis === 'x' ? m.ox + off : m.ox;
      var ny = m.axis === 'y' ? m.oy + off - m.range / 2 : m.oy;
      m.dx = nx - m.x; m.dy = ny - m.y;
      m.x = nx; m.y = ny;
    });
  }

  // Closed gates behave as walls.
  function solidList(level) {
    var list = level.solids.slice();
    level.gates.forEach(function (g) {
      if (!g.open) list.push({ x: g.x, y: g.y - g.h, w: g.w, h: g.h, gate: g });
    });
    return list;
  }

  // input: { left, right, jumpPressed (this frame), jumpHeld }
  function step(p, input, level, dt) {
    var events = [];
    var wasGround = p.onGround;

    // Ride a moving platform.
    if (p.onGround && p.groundRef && p.groundRef.kind === 'mover') {
      p.x += p.groundRef.dx;
      p.y = p.groundRef.y - p.h;
    }

    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var accel = p.onGround ? P.accelGround : P.accelAir;
    if (dir !== 0) {
      p.vx += dir * accel * dt;
      if (Math.abs(p.vx) > P.runSpeed) p.vx = P.runSpeed * Math.sign(p.vx);
      p.facing = dir;
    } else if (p.onGround) {
      var f = P.friction * dt;
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - f * Math.sign(p.vx);
    } else {
      p.vx *= Math.pow(0.2, dt);
    }

    // Jumping.
    p.coyote = p.onGround ? P.coyote : Math.max(0, p.coyote - dt);
    p.jumpBuf = input.jumpPressed ? P.buffer : Math.max(0, p.jumpBuf - dt);
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -P.jumpVel;
      p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.groundRef = null;
      events.push('jump');
    }
    if (!input.jumpHeld && p.vy < 0) p.vy += P.gravity * dt * (1 / P.jumpCut - 1); // short hop when released
    p.vy = Math.min(P.maxFall, p.vy + P.gravity * dt);

    var solids = solidList(level);

    // Horizontal move and resolve.
    p.x += p.vx * dt;
    for (var i = 0; i < solids.length; i++) {
      var s = solids[i];
      if (overlap(p, s)) {
        if (p.vx > 0 || (p.x + p.w / 2) < s.x + s.w / 2) p.x = s.x - p.w; else p.x = s.x + s.w;
        p.vx = 0;
        if (s.gate) events.push({ type: 'gateTouch', gate: s.gate });
      }
    }
    if (p.x < 0) { p.x = 0; p.vx = 0; }
    if (p.x + p.w > level.width) { p.x = level.width - p.w; p.vx = 0; }

    // Vertical move and resolve.
    var prevBottom = p.y + p.h;
    p.y += p.vy * dt;
    p.onGround = false;
    var landedOn = null;
    for (var j = 0; j < solids.length; j++) {
      var b = solids[j];
      if (overlap(p, b)) {
        if (p.vy >= 0 && prevBottom <= b.y + 12) { p.y = b.y - p.h; p.vy = 0; p.onGround = true; landedOn = b; }
        else if (p.vy < 0) { p.y = b.y + b.h; p.vy = 0; }
      }
    }
    var oneWay = level.platforms.concat(level.movers);
    for (var k = 0; k < oneWay.length; k++) {
      var o = oneWay[k];
      var top = o.y;
      var horiz = p.x + p.w > o.x + 4 && p.x < o.x + o.w - 4;
      var oPrevTop = top - (o.dy || 0);
      if (horiz && p.vy >= 0 && prevBottom <= oPrevTop + 6 && p.y + p.h >= top) {
        p.y = top - p.h; p.vy = 0; p.onGround = true; landedOn = o;
      }
    }
    p.groundRef = landedOn;

    // Gate contact while standing against it.
    level.gates.forEach(function (g) {
      if (g.open) return;
      var zone = { x: g.x - 6, y: g.y - g.h, w: g.w + 12, h: g.h };
      if (overlap(p, zone)) events.push({ type: 'gateTouch', gate: g });
    });

    if (!wasGround && p.onGround && p.airTime > 0.15) { events.push('land'); p.landTimer = 0.18; }
    p.airTime = p.onGround ? 0 : p.airTime + dt;
    p.landTimer = Math.max(0, p.landTimer - dt);
    return events;
  }

  var Physics = { P: P, createPlayer: createPlayer, step: step, updateMovers: updateMovers, overlap: overlap, solidList: solidList };
  if (isNode) module.exports = Physics;
  else (window.MB = window.MB || {}).Physics = Physics;
})();
