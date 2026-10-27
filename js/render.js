/* All artwork is drawn in code: no image files, no fonts to download.
 * Characters are original: a young footballer (Noah's hero) and Biscuit
 * the teddy-bear coach. */
(function () {
  'use strict';
  var VIEW_W = 1280, VIEW_H = 720;
  var OUTLINE = '#1b1b2f';

  var COL = {
    skin: '#6b3e26', skinShade: '#55301d', hair: '#151018',
    shirt: '#e63946', shirtDark: '#b8242f', trim: '#ffffff',
    shorts: '#1d3a8a', sock: '#ffffff', sockBand: '#e63946', boot: '#222', sole: '#59c3ff',
    bear: '#b5793f', bearDark: '#8d5a2b', muzzle: '#f0d2a8', scarfA: '#2453c4', scarfB: '#e63946'
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // ---------------- Characters ----------------

  function limb(ctx, x1, y1, x2, y2, width, color) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = width + 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // Hero, drawn with feet at (x, y). s = { facing, run (phase), air, vy, land, win, hurt, t }
  function drawHero(ctx, x, y, s) {
    s = s || {};
    var t = s.t || 0;
    ctx.save();
    ctx.translate(x, y);
    var sx = 1, sy = 1;
    if (s.land > 0) { sy = 1 - s.land * 1.1; sx = 1 + s.land * 0.9; }
    else if (s.air) { sy = s.vy < 0 ? 1.06 : 0.98; sx = s.vy < 0 ? 0.95 : 1.02; }
    ctx.scale((s.facing || 1) * sx, sy);

    var running = !s.air && Math.abs(s.speed || 0) > 20;
    var ph = s.run || 0;
    var legA = running ? Math.sin(ph) * 0.7 : 0;
    var bob = running ? Math.abs(Math.sin(ph)) * 3 : Math.sin(t * 2.2) * 1.2;
    if (s.win) bob = Math.abs(Math.sin(t * 6)) * 8;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.translate(0, -bob);
    var hipY = -34;
    // Legs
    function leg(angle, back) {
      var kx = Math.sin(angle) * 14, ky = hipY + 16;
      var fx = Math.sin(angle) * 22 + (s.air ? (back ? -6 : 8) : 0), fy = s.air ? -10 : -6;
      if (s.air) { ky = hipY + 12; }
      var skin = back ? COL.skinShade : COL.skin;
      limb(ctx, back ? -5 : 5, hipY, kx + (back ? -5 : 5), ky, 9, skin);
      limb(ctx, kx + (back ? -5 : 5), ky, fx + (back ? -5 : 5), fy, 9, COL.sock);
      // sock band
      ctx.strokeStyle = COL.sockBand; ctx.lineWidth = 9; ctx.lineCap = 'butt';
      var bx = kx + (back ? -5 : 5) + (fx - kx) * 0.25, by = ky + (fy - ky) * 0.25;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (fx - kx) * 0.12, by + (fy - ky) * 0.12); ctx.stroke();
      // boot
      ctx.fillStyle = COL.boot; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
      rr(ctx, fx + (back ? -5 : 5) - 7, fy - 2, 18, 9, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = COL.sole; ctx.fillRect(fx + (back ? -5 : 5) - 6, fy + 5, 16, 2);
    }
    leg(-legA, true);
    // Shorts
    ctx.fillStyle = COL.shorts; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    rr(ctx, -14, hipY - 8, 28, 16, 5); ctx.fill(); ctx.stroke();
    leg(legA, false);

    // Back arm
    var armSwing = running ? -Math.sin(ph) * 0.9 : Math.sin(t * 2.2) * 0.08;
    var shoulderY = hipY - 26;
    if (s.win) {
      limb(ctx, -8, shoulderY, -20, shoulderY - 22, 8, COL.skinShade);
    } else {
      limb(ctx, -6, shoulderY, -6 + Math.sin(armSwing) * 16, shoulderY + 20, 8, COL.skinShade);
    }
    // Shirt
    ctx.fillStyle = COL.shirt; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    rr(ctx, -15, shoulderY - 6, 30, 34, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.trim; ctx.fillRect(-15, shoulderY + 22, 30, 3); // hem stripe
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('8', 2, shoulderY + 17);
    // Front arm
    if (s.win) {
      limb(ctx, 8, shoulderY, 20, shoulderY - 24, 8, COL.skin);
    } else {
      var ax = 8 + Math.sin(-armSwing) * 16;
      limb(ctx, 8, shoulderY, ax, shoulderY + 20, 8, COL.skin);
    }
    // Sleeves
    ctx.fillStyle = COL.trim;
    ctx.beginPath(); ctx.arc(10, shoulderY + 2, 5, 0, Math.PI * 2); ctx.fill();

    // Head
    var hy = shoulderY - 22;
    ctx.fillStyle = COL.skin; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, hy, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // ear
    ctx.beginPath(); ctx.arc(-14, hy + 2, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Hair: short tight curls
    ctx.fillStyle = COL.hair;
    ctx.beginPath(); ctx.arc(0, hy - 4, 19, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    for (var i = 0; i < 7; i++) {
      var a = Math.PI * (1.0 + i * 0.16);
      ctx.beginPath(); ctx.arc(Math.cos(a) * 17, hy - 4 + Math.sin(a) * 17, 5, 0, Math.PI * 2); ctx.fill();
    }
    // Eyes
    var blink = (Math.floor(t * 10) % 37) === 0;
    var ex = 6;
    if (s.hurt) {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
      [ex - 4, ex + 8].forEach(function (cx) {
        ctx.beginPath(); ctx.moveTo(cx - 3, hy - 3); ctx.lineTo(cx + 3, hy + 3); ctx.moveTo(cx + 3, hy - 3); ctx.lineTo(cx - 3, hy + 3); ctx.stroke();
      });
    } else if (blink) {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ex - 7, hy); ctx.lineTo(ex - 1, hy); ctx.moveTo(ex + 5, hy); ctx.lineTo(ex + 11, hy); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex - 4, hy - 1, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ex + 8, hy - 1, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = OUTLINE;
      ctx.beginPath(); ctx.arc(ex - 3, hy, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 9, hy, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex - 2, hy - 1.5, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 10, hy - 1.5, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Smile
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    if (s.hurt) { ctx.arc(ex + 2, hy + 12, 4, Math.PI * 1.1, Math.PI * 1.9); }
    else if (s.win || s.happy) { ctx.fillStyle = '#fff'; ctx.arc(ex + 2, hy + 7, 6, 0.1, Math.PI - 0.1); ctx.closePath(); ctx.fill(); }
    else { ctx.arc(ex + 2, hy + 6, 5, 0.25, Math.PI - 0.25); }
    ctx.stroke();
    // Cheek
    ctx.fillStyle = 'rgba(255,120,120,0.25)';
    ctx.beginPath(); ctx.arc(ex + 14, hy + 6, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    if (s.hurt) {
      // Dizzy stars circling the head
      for (var k = 0; k < 3; k++) {
        var aa = t * 5 + k * 2.1;
        star(ctx, x + Math.cos(aa) * 22, y - 100 + Math.sin(aa) * 6, 6, '#ffd23f');
      }
    }
  }

  // Biscuit the teddy, feet at (x, y). s = { facing, t, cheer, hop }
  function drawTeddy(ctx, x, y, s) {
    s = s || {};
    var t = s.t || 0;
    ctx.save();
    ctx.translate(x, y - (s.hop || 0));
    ctx.scale((s.facing || 1) * (s.scale || 1), s.scale || 1);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    if (!s.noShadow) { ctx.beginPath(); ctx.ellipse(0, s.hop || 0, 16, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    // feet
    ctx.fillStyle = COL.bearDark;
    ctx.beginPath(); ctx.ellipse(-8, -4, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(8, -4, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // body
    ctx.fillStyle = COL.bear;
    ctx.beginPath(); ctx.ellipse(0, -20, 15, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.muzzle;
    ctx.beginPath(); ctx.ellipse(1, -18, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
    // arms
    var wave = s.cheer ? Math.sin(t * 10) * 0.5 : Math.sin(t * 2) * 0.1;
    ctx.fillStyle = COL.bear;
    ctx.save(); ctx.translate(12, -28); ctx.rotate(s.cheer ? -2.2 + wave : 0.5 + wave);
    rr(ctx, -4, 0, 8, 16, 4); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(-12, -28); ctx.rotate(s.cheer ? 2.2 - wave : -0.5 - wave);
    rr(ctx, -4, 0, 8, 16, 4); ctx.fill(); ctx.stroke(); ctx.restore();
    // scarf (stripes)
    ctx.fillStyle = COL.scarfA;
    rr(ctx, -13, -39, 26, 7, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.scarfB;
    ctx.fillRect(-6, -38, 4, 5); ctx.fillRect(4, -38, 4, 5);
    ctx.fillStyle = COL.scarfA;
    ctx.save(); ctx.translate(-9, -34); ctx.rotate(0.3 + Math.sin(t * 3) * 0.1);
    rr(ctx, -3, 0, 7, 14, 2); ctx.fill(); ctx.stroke(); ctx.restore();
    // head
    var hy = -52;
    ctx.fillStyle = COL.bear;
    ctx.beginPath(); ctx.arc(-11, hy - 11, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(11, hy - 11, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.muzzle;
    ctx.beginPath(); ctx.arc(-11, hy - 11, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, hy - 11, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COL.bear;
    ctx.beginPath(); ctx.arc(0, hy, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.muzzle;
    ctx.beginPath(); ctx.ellipse(2, hy + 5, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = OUTLINE;
    ctx.beginPath(); ctx.ellipse(2, hy + 2, 3.2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-4, hy - 3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, hy - 3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(2, hy + 6, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
  }

  // ---------------- Props ----------------

  function star(ctx, x, y, r, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = color; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rad = i % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawFootball(ctx, x, y, r, spin) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin || 0);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = OUTLINE;
    function pent(cx, cy, pr) {
      ctx.beginPath();
      for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; ctx.lineTo(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr); }
      ctx.closePath(); ctx.fill();
    }
    pent(0, 0, r * 0.38);
    for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; pent(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3); }
    ctx.restore();
    ctx.restore();
  }

  function drawCone(ctx, x, y, hc) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#ff7b00'; ctx.strokeStyle = hc ? '#000' : OUTLINE; ctx.lineWidth = hc ? 4 : 3;
    ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-4, -40); ctx.lineTo(4, -40); ctx.lineTo(14, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-9, -24, 18, 6);
    ctx.fillStyle = '#ff7b00'; ctx.strokeStyle = hc ? '#000' : OUTLINE;
    rr(ctx, -20, -6, 40, 7, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawDrone(ctx, d, t, hc) {
    ctx.save(); ctx.translate(d.x, d.y);
    var tilt = d.axis === 'x' ? Math.cos(d.t * d.speed * 2) * 0.15 : 0;
    ctx.rotate(tilt);
    // propeller
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -34); ctx.stroke();
    var pw = Math.abs(Math.cos(t * 25)) * 22 + 4;
    ctx.fillStyle = '#9aa5b1'; rr(ctx, -pw, -38, pw * 2, 5, 2); ctx.fill(); ctx.stroke();
    // body
    ctx.fillStyle = '#e9eef5'; ctx.lineWidth = hc ? 5 : 3; ctx.strokeStyle = hc ? '#000' : OUTLINE;
    ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-d.r + 4, 8, d.r * 2 - 8, 5);
    // eyes (googly)
    var look = Math.sin(t * 1.7 + d.ox) * 2;
    ctx.fillStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE;
    ctx.beginPath(); ctx.arc(-8, -5, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(8, -5, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OUTLINE;
    ctx.beginPath(); ctx.arc(-8 + look, -4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8 + look, -4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 3, 6, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.restore();
  }

  function drawGate(ctx, g, t, hc) {
    var top = g.y - g.h;
    ctx.save();
    // posts
    ctx.fillStyle = '#5b6cff'; ctx.strokeStyle = hc ? '#000' : OUTLINE; ctx.lineWidth = hc ? 5 : 3;
    rr(ctx, g.x - 12, top - 20, 16, g.h + 20, 5); ctx.fill(); ctx.stroke();
    rr(ctx, g.x + g.w - 4, top - 20, 16, g.h + 20, 5); ctx.fill(); ctx.stroke();
    // bars (slide upwards when open)
    var lift = g.lift * g.h;
    ctx.save();
    ctx.beginPath(); ctx.rect(g.x + 4, top - 20, g.w - 8, g.h + 20); ctx.clip();
    ctx.fillStyle = g.open ? 'rgba(120,220,140,0.35)' : 'rgba(255,210,63,0.35)';
    ctx.fillRect(g.x + 4, top, g.w - 8, g.h - lift);
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6;
    for (var by = top + 20; by < g.y - lift; by += 34) {
      ctx.beginPath(); ctx.moveTo(g.x + 4, by - (0)); ctx.lineTo(g.x + g.w - 4, by); ctx.stroke();
    }
    ctx.restore();
    // sign
    var sy = top - 70;
    ctx.fillStyle = g.open ? '#2fbf71' : '#ffd23f'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    rr(ctx, g.x - 40, sy, g.w + 80, 46, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OUTLINE; ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.fillText(g.open ? 'GATE OPEN ✓' : 'MATHS GATE', g.x + g.w / 2, sy + 19);
    ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
    ctx.fillText(g.open ? 'Well done!' : '? × ? = ?', g.x + g.w / 2, sy + 39);
    if (!g.open) {
      var pulse = 0.5 + 0.5 * Math.sin(t * 3);
      ctx.globalAlpha = 0.25 + pulse * 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(g.x + g.w / 2, g.y - 60, 20, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = OUTLINE; ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
      ctx.fillText('×', g.x + g.w / 2, g.y - 51);
    }
    ctx.restore();
  }

  function drawCheckpoint(ctx, c, t) {
    ctx.save(); ctx.translate(c.x, c.y);
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -80); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -80); ctx.stroke();
    var wave = Math.sin(t * 4) * 4;
    ctx.fillStyle = c.reached ? '#2fbf71' : '#ffd23f'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(2, -80); ctx.quadraticCurveTo(22, -78 + wave, 40, -70); ctx.lineTo(2, -56); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (c.reached) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(10, -69); ctx.lineTo(15, -64); ctx.lineTo(24, -74); ctx.stroke();
    }
    ctx.restore();
  }

  function drawGoal(ctx, goal, theme, t) {
    ctx.save(); ctx.translate(goal.x, goal.y);
    var w = 170, h = 120;
    // net
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
    for (var i = 0; i <= w; i += 14) { ctx.beginPath(); ctx.moveTo(i, -h); ctx.lineTo(i + 20, 0); ctx.stroke(); }
    for (var j = 0; j <= h; j += 14) { ctx.beginPath(); ctx.moveTo(0, -h + j); ctx.lineTo(w + 20, -h + j); ctx.stroke(); }
    // frame
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.lineTo(w, -h); ctx.lineTo(w, 0); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.lineTo(w, -h); ctx.lineTo(w, 0); ctx.stroke();
    // banner
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    rr(ctx, 20, -h - 52, w - 40, 36, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OUTLINE; ctx.font = 'bold 22px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('GOAL!', w / 2, -h - 26);
    if (theme === 'sky') drawTrophy(ctx, w / 2, -h - 60, 1 + Math.sin(t * 2) * 0.03);
    ctx.restore();
  }

  function drawTrophy(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#ffcc33'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-22, -60); ctx.lineTo(22, -60); ctx.quadraticCurveTo(22, -24, 0, -18); ctx.quadraticCurveTo(-22, -24, -22, -60); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-24, -48, 9, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(24, -48, 9, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillRect(-4, -18, 8, 10); ctx.strokeRect(-4, -18, 8, 10);
    rr(ctx, -16, -9, 32, 9, 3); ctx.fill(); ctx.stroke();
    star(ctx, 0, -42, 8, '#fff');
    ctx.restore();
  }

  // ---------------- Scenery ----------------

  var THEMES = {
    training: { sky: ['#5ec8ff', '#bfeaff'], turf: '#3bb54a', turf2: '#34a343', edge: '#ffffff', dirt: '#8a5a33' },
    neon: { sky: ['#0d0b2e', '#3a1f6b'], turf: '#1f8a5a', turf2: '#1a7a4f', edge: '#4df0ff', dirt: '#2a1d4a' },
    sky: { sky: ['#ff9ec7', '#9fe6ff'], turf: '#56d364', turf2: '#4cc35a', edge: '#ffffff', dirt: '#a07850' }
  };

  function cloud(ctx, x, y, s) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
    ctx.arc(x + 30 * s, y - 12 * s, 32 * s, 0, Math.PI * 2);
    ctx.arc(x + 64 * s, y, 24 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x, y, 64 * s, 24 * s);
  }

  // Repeating parallax layer helper.
  function tile(camX, factor, spacing, fn) {
    var off = camX * factor;
    var first = Math.floor(off / spacing) - 1;
    for (var i = first; i < first + Math.ceil(VIEW_W / spacing) + 3; i++) fn(i * spacing - off, i);
  }

  function drawBackground(ctx, theme, camX, t, opts) {
    var th = THEMES[theme];
    var g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    var drift = opts.reducedMotion ? 0 : t * 8;

    if (theme === 'training') {
      ctx.fillStyle = '#fff4b0';
      ctx.beginPath(); ctx.arc(1080 - camX * 0.02, 110, 50, 0, Math.PI * 2); ctx.fill();
      tile(camX + drift * 4, 0.15, 420, function (x, i) { cloud(ctx, x, 90 + hash(i) * 120, 0.8 + hash(i + 3) * 0.6); });
      // hills
      ctx.fillStyle = '#7fd67a';
      tile(camX, 0.3, 520, function (x, i) { ctx.beginPath(); ctx.ellipse(x, 560, 300, 150 + hash(i) * 60, 0, Math.PI, 0); ctx.fill(); });
      // trees
      tile(camX, 0.5, 260, function (x, i) {
        var h = 70 + hash(i) * 40;
        ctx.fillStyle = '#6b4226'; ctx.fillRect(x - 6, 560 - h * 0.5, 12, h * 0.5);
        ctx.fillStyle = hash(i + 1) > 0.5 ? '#2e9e44' : '#3fb257';
        ctx.beginPath(); ctx.arc(x, 560 - h * 0.6, h * 0.42, 0, Math.PI * 2); ctx.fill();
      });
      // advertising boards (original, generic)
      tile(camX, 0.75, 340, function (x, i) {
        var cols = ['#e63946', '#2453c4', '#ffd23f', '#ffffff'];
        ctx.fillStyle = cols[Math.floor(hash(i) * 4)]; ctx.fillRect(x, 540, 300, 34);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.font = 'bold 18px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(['KEEP TRYING!', 'GREAT TEAMWORK', 'TIMES TABLES FC', 'PRACTISE & PLAY'][Math.floor(hash(i + 9) * 4)], x + 150, 563);
      });
    } else if (theme === 'neon') {
      // stars (no twinkle with reduced motion; never a strobe)
      for (var s = 0; s < 70; s++) {
        var sx = (hash(s) * 2400 - camX * 0.05) % 1400; if (sx < 0) sx += 1400;
        var a = opts.reducedMotion ? 0.6 : 0.45 + 0.3 * Math.sin(t * 0.8 + s);
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.fillRect(sx, hash(s + 50) * 300, 2, 2);
      }
      // stadium stands
      tile(camX, 0.25, 640, function (x, i) {
        ctx.fillStyle = '#26195a';
        ctx.beginPath(); ctx.moveTo(x, 600); ctx.lineTo(x + 40, 330); ctx.lineTo(x + 600, 330); ctx.lineTo(x + 640, 600); ctx.fill();
        for (var r = 0; r < 7; r++) {
          for (var c = 0; c < 26; c++) {
            var h = hash(i * 1000 + r * 40 + c);
            ctx.fillStyle = h > 0.66 ? '#e63946' : h > 0.33 ? '#4d7cff' : '#ffd23f';
            ctx.globalAlpha = 0.55;
            ctx.beginPath(); ctx.arc(x + 70 + c * 20 + (r % 2) * 10, 350 + r * 26 + (opts.reducedMotion ? 0 : Math.sin(t * 3 + c + r) * 1.5), 5, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      });
      // floodlights with soft beams
      tile(camX, 0.4, 700, function (x) {
        ctx.fillStyle = '#5a4c8f'; ctx.fillRect(x + 340, 120, 10, 300);
        ctx.fillStyle = '#fffbe0'; ctx.fillRect(x + 315, 105, 60, 22);
        var grad = ctx.createLinearGradient(0, 120, 0, 600);
        grad.addColorStop(0, 'rgba(255,250,210,0.22)'); grad.addColorStop(1, 'rgba(255,250,210,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(x + 320, 125); ctx.lineTo(x + 370, 125); ctx.lineTo(x + 520, 600); ctx.lineTo(x + 170, 600); ctx.fill();
      });
      // neon strip
      ctx.fillStyle = '#ff4fd8'; ctx.fillRect(0, 586, VIEW_W, 4);
    } else {
      // rainbow
      var cols = ['#ff6b6b', '#ffb84d', '#ffe66d', '#7ae582', '#59c3ff', '#9b8cff'];
      ctx.lineWidth = 18;
      cols.forEach(function (c, i) {
        ctx.strokeStyle = c; ctx.globalAlpha = 0.45;
        ctx.beginPath(); ctx.arc(700 - camX * 0.04, 760, 560 - i * 18, Math.PI, 0); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      tile(camX + drift * 3, 0.12, 360, function (x, i) { cloud(ctx, x, 120 + hash(i) * 200, 0.7 + hash(i + 2) * 0.7); });
      // distant floating islands
      tile(camX, 0.3, 480, function (x, i) {
        var y = 300 + hash(i) * 140;
        ctx.fillStyle = 'rgba(120,90,160,0.35)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 140, y); ctx.lineTo(x + 70, y + 70); ctx.fill();
        ctx.fillStyle = 'rgba(90,200,110,0.45)'; ctx.fillRect(x, y - 8, 140, 10);
      });
      tile(camX + drift * 5, 0.6, 500, function (x, i) { cloud(ctx, x, 640 + hash(i) * 40, 1.1); });
    }

    if (opts.highContrast) {
      // Calm the scenery so the platforms and hazards stand out.
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function drawSolid(ctx, s, theme, hc) {
    var th = THEMES[theme];
    if (s.kind === 'island') {
      ctx.fillStyle = th.dirt; ctx.strokeStyle = OUTLINE; ctx.lineWidth = hc ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.w, s.y); ctx.lineTo(s.x + s.w - 20, s.y + s.h);
      ctx.lineTo(s.x + s.w * 0.6, s.y + s.h + 40); ctx.lineTo(s.x + s.w * 0.3, s.y + s.h + 25); ctx.lineTo(s.x + 20, s.y + s.h);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = th.dirt; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = hc ? 5 : 3; ctx.strokeRect(s.x, s.y, s.w, s.h);
    }
    // turf top with mowing stripes
    for (var x = s.x; x < s.x + s.w; x += 60) {
      ctx.fillStyle = (Math.floor(x / 60) % 2) ? th.turf : th.turf2;
      ctx.fillRect(x, s.y, Math.min(60, s.x + s.w - x), 26);
    }
    ctx.fillStyle = hc ? '#ffffff' : th.edge; ctx.fillRect(s.x, s.y, s.w, hc ? 6 : 4);
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = hc ? 5 : 3;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.w, s.y); ctx.stroke();
  }

  function drawPlatform(ctx, p, theme, hc) {
    var main = theme === 'neon' ? '#4a3a9a' : theme === 'sky' ? '#ffffff' : '#c98b4f';
    ctx.fillStyle = main; ctx.strokeStyle = hc ? '#fff' : OUTLINE; ctx.lineWidth = hc ? 5 : 3;
    rr(ctx, p.x, p.y, p.w, p.h, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = theme === 'neon' ? '#4df0ff' : theme === 'sky' ? '#7ae582' : '#3bb54a';
    ctx.fillRect(p.x + 6, p.y + 3, p.w - 12, 6);
    if (p.kind === 'mover') {
      ctx.fillStyle = OUTLINE; ctx.font = 'bold 14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.axis === 'x' ? '← →' : '↑ ↓', p.x + p.w / 2, p.y + 19);
    }
  }

  // ---------------- World ----------------

  function drawWorld(ctx, G) {
    var L = G.level, t = G.time, cam = G.camX, hc = G.settings.highContrast;
    drawBackground(ctx, L.theme, cam, t, G.settings);
    ctx.save();
    ctx.translate(-Math.round(cam), 0);
    var vis = function (x, w) { return x + w > cam - 100 && x < cam + VIEW_W + 100; };

    L.solids.forEach(function (s) { if (vis(s.x, s.w)) drawSolid(ctx, s, L.theme, hc); });
    L.platforms.forEach(function (p) { if (vis(p.x, p.w)) drawPlatform(ctx, p, L.theme, hc); });
    L.movers.forEach(function (p) { if (vis(p.x, p.w)) drawPlatform(ctx, p, L.theme, hc); });
    L.checkpoints.forEach(function (c) { if (vis(c.x - 10, 60)) drawCheckpoint(ctx, c, t); });
    drawGoal(ctx, L.goal, L.theme, t);
    L.gates.forEach(function (g) { if (vis(g.x - 60, 200)) drawGate(ctx, g, t, hc); });
    L.cones.forEach(function (c) { if (vis(c.x - 30, 60)) drawCone(ctx, c.x, c.y, hc); });
    L.footballs.forEach(function (b) {
      if (b.taken || !vis(b.x - 20, 40)) return;
      var bob = G.settings.reducedMotion ? 0 : Math.sin(t * 3 + b.i) * 4;
      drawFootball(ctx, b.x, b.y + bob, 13, G.settings.reducedMotion ? 0 : t * 1.5 + b.i);
    });
    L.drones.forEach(function (d) { if (vis(d.x - 40, 80)) drawDrone(ctx, d, t, hc); });

    // Teddy follows behind the hero
    drawTeddy(ctx, G.teddy.x, G.teddy.y, { facing: G.teddy.facing, t: t, cheer: G.teddy.cheer > 0, hop: G.teddy.hop });

    var p = G.player;
    if (!(G.hurtTimer > 0 && G.hurtTimer < 0.25)) {
      drawHero(ctx, p.x + p.w / 2, p.y + p.h, {
        facing: p.facing, run: G.runPhase, air: !p.onGround, vy: p.vy, speed: p.vx,
        land: G.settings.reducedMotion ? 0 : p.landTimer, win: G.winTimer > 0, hurt: G.hurtTimer > 0, t: t
      });
    }

    // particles
    G.particles.forEach(function (q) {
      ctx.globalAlpha = Math.max(0, Math.min(1, q.life * 2));
      if (q.kind === 'star') star(ctx, q.x, q.y, q.size, q.color);
      else if (q.kind === 'text') {
        ctx.fillStyle = OUTLINE; ctx.font = 'bold 22px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(q.text, q.x, q.y); ctx.fillText(q.text, q.x, q.y);
      } else { ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size * 0.6); }
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  var Render = {
    VIEW_W: VIEW_W, VIEW_H: VIEW_H,
    drawWorld: drawWorld, drawBackground: drawBackground,
    drawHero: drawHero, drawTeddy: drawTeddy, drawFootball: drawFootball, drawTrophy: drawTrophy, star: star
  };
  (window.MB = window.MB || {}).Render = Render;
})();
