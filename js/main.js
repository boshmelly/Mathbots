/* MathBots: Kick-Off Quest - game state, loop and screens. */
(function () {
  'use strict';
  var MB = window.MB;
  var C = MB.Config, UI = MB.UI, $ = UI.$;
  var Levels = MB.Levels, Physics = MB.Physics, Render = MB.Render, Audio = MB.Audio, Input = MB.Input;
  var Maths = MB.Maths, Learning = MB.Learning, Rewards = MB.Rewards, Challenge = MB.Challenge;

  var DEBUG = /[?&]debug=1/.test(location.search);
  var STEP = 1 / 60;

  // ---------------- Save data ----------------
  var storage = MB.Save.detectStorage();
  var saver = MB.Save.createSaveManager(storage);
  var loaded = saver.load();
  var save = loaded.data;
  var dirty = false;
  var RESET_COPY = 'progress.before-reset.json';

  if (!save.savedAt) {
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) save.settings.reducedMotion = true; } catch (e) { /* ignore */ }
  }

  function saveNow() {
    var r = saver.save(save);
    dirty = false;
    if (!r.ok) UI.toast('Could not save just now - ask a grown-up to check Settings', 4);
    return r;
  }
  function markDirty() { dirty = true; }
  setInterval(function () { if (dirty) saveNow(); }, 3000);

  function hasProgress() {
    if (save.activeMission || save.player.coins > 0) return true;
    return C.MISSIONS.some(function (m) { return save.missions[m.id].completed; });
  }

  // ---------------- Canvas scaling ----------------
  var canvas = $('game'), ctx = canvas.getContext('2d');
  var stage = $('stage');
  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    var s = Math.min(w / 1280, h / 720);
    stage.style.transform = 'translate(' + ((w - 1280 * s) / 2) + 'px,' + ((h - 720 * s) / 2) + 'px) scale(' + s + ')';
    var k = Math.min(2.5, s * (window.devicePixelRatio || 1));
    canvas.width = Math.round(1280 * k); canvas.height = Math.round(720 * k);
    ctx.setTransform(k, 0, 0, k, 0, 0);
  }
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  fit();
  var fittedW = 0, fittedH = 0;
  function refitIfNeeded() {
    if (window.innerWidth !== fittedW || window.innerHeight !== fittedH) {
      fittedW = window.innerWidth; fittedH = window.innerHeight;
      fit();
    }
  }

  // ---------------- Game state ----------------
  var G = {
    mode: 'menu', time: 0, camX: 0, runPhase: 0,
    level: null, def: null, missionId: null, am: null,
    player: null, teddy: { x: 0, y: 600, facing: 1, cheer: 0, hop: 0 },
    particles: [], hurtTimer: 0, invuln: 0, winTimer: 0, completed: false,
    settings: save.settings, hintsShown: {}, ch: null, chState: 'idle', gate: null, typed: '', winResult: null
  };

  function defOf(id) { return C.MISSIONS.filter(function (m) { return m.id === id; })[0]; }
  function newRunId() { return 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  function setMenuScene(id) {
    G.level = Levels.buildLevel(id || 'training');
    G.player = Physics.createPlayer(820, 600);
    G.player.facing = -1;
    G.teddy.x = 900; G.teddy.y = 600; G.teddy.facing = -1;
    G.camX = 0;
  }

  // ---------------- Settings ----------------
  function applySettings() {
    var s = save.settings;
    document.body.classList.toggle('hc', s.highContrast);
    document.body.classList.toggle('rm', s.reducedMotion);
    Audio.setMuted(s.muted);
    ['btn-title-sound', 'btn-hud-sound', 'set-sound', 'pause-sound'].forEach(function (id) { UI.setToggle($(id), 'Sound', !s.muted); });
    ['set-motion', 'pause-motion'].forEach(function (id) { UI.setToggle($(id), 'Reduced motion', s.reducedMotion); });
    UI.setToggle($('set-contrast'), 'High contrast', s.highContrast);
    UI.setToggle($('set-touch'), 'On-screen buttons', s.touchButtons);
    $('touch').classList.toggle('hidden', !(G.mode === 'playing' && s.touchButtons));
  }
  function toggleSetting(key) {
    save.settings[key] = !save.settings[key];
    if (key === 'muted' && !save.settings.muted) { Audio.setMuted(false); Audio.unlock(); Audio.play('click'); }
    applySettings();
    saveNow();
  }

  // ---------------- Missions ----------------
  function startMission(id, resume) {
    var m = save.missions[id];
    if (!m || !m.unlocked) return;
    G.def = defOf(id);
    G.missionId = id;
    G.level = Levels.buildLevel(id);
    var am = (resume && save.activeMission && save.activeMission.id === id) ? save.activeMission : null;
    if (!am) am = { id: id, runId: newRunId(), checkpoint: 0, gatesOpened: [], collected: [], runCoins: 0 };
    save.activeMission = am;
    G.am = am;
    var L = G.level;
    L.gates.forEach(function (g) { if (am.gatesOpened.indexOf(g.id) !== -1) { g.open = true; g.lift = 1; } });
    L.footballs.forEach(function (b) { if (am.collected.indexOf(b.i) !== -1) b.taken = true; });
    if (am.checkpoint >= L.checkpoints.length) am.checkpoint = 0;
    L.checkpoints.forEach(function (c) { c.reached = c.i <= am.checkpoint; });
    placeAtCheckpoint();
    G.camX = targetCam();
    G.hintsShown = {}; G.hurtTimer = 0; G.winTimer = 0; G.invuln = 0; G.particles = []; G.completed = false;
    G.chState = 'idle';
    $('hud-mission').textContent = G.def.short + ': ' + G.def.name;
    updateHud();
    saveNow();
    if (id === 'training' && !save.tutorialSeen) { openTutorial(); return; }
    beginPlay();
    if (resume && am.checkpoint > 0) UI.teddySay('Welcome back! We start from your last flag.', 4);
  }

  function beginPlay() {
    G.mode = 'playing';
    UI.show(null);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    Input.clear();
    Input.enabled = true;
    $('hud').classList.remove('hidden');
    applySettings();
  }

  function placeAtCheckpoint() {
    var c = G.level.checkpoints[G.am.checkpoint];
    G.player = Physics.createPlayer(c.x + 30, c.y);
    G.teddy.x = c.x - 20; G.teddy.y = c.y;
  }

  function leaveToMenu(screen) {
    G.mode = 'menu';
    Input.enabled = false; Input.clear();
    $('hud').classList.add('hidden');
    UI.teddyHide();
    applySettings();
    saveNow();
    setMenuScene('training');
    if (screen === 'missions') openMissions(); else openTitle();
  }

  // ---------------- Update ----------------
  function targetCam() {
    var p = G.player;
    var t = p.x + p.w / 2 - 1280 * 0.38 + p.facing * 60;
    return Math.max(0, Math.min(G.level.width - 1280, t));
  }

  function burst(x, y, n, kind, colors) {
    if (save.settings.reducedMotion) n = Math.ceil(n * 0.25);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 220;
      G.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 160, g: 500,
        life: 0.7 + Math.random() * 0.6, size: kind === 'star' ? 6 + Math.random() * 5 : 6 + Math.random() * 6,
        kind: kind, color: colors[i % colors.length]
      });
    }
  }
  function floatText(x, y, text) {
    G.particles.push({ x: x, y: y, vx: 0, vy: -70, g: 0, life: 1.0, kind: 'text', text: text });
  }

  function updateWorldBits(dt) {
    var L = G.level;
    Physics.updateMovers(L.movers, dt);
    L.drones.forEach(function (d) {
      d.t += dt;
      if (d.axis === 'x') d.x = d.ox + Math.sin(d.t * d.speed) * d.range;
      else d.y = d.oy + Math.sin(d.t * d.speed) * d.range;
    });
    L.gates.forEach(function (g) { if (g.open && g.lift < 1) g.lift = Math.min(1, g.lift + dt * 1.6); });
    for (var i = G.particles.length - 1; i >= 0; i--) {
      var q = G.particles[i];
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; q.life -= dt;
      if (q.life <= 0) G.particles.splice(i, 1);
    }
    // Teddy follows the hero.
    var p = G.player;
    var tx = p.x + p.w / 2 - 62 * p.facing;
    G.teddy.x += (tx - G.teddy.x) * Math.min(1, dt * 4);
    var ty = Math.min(p.y + p.h, 700);
    G.teddy.y += (ty - G.teddy.y) * Math.min(1, dt * 5);
    G.teddy.facing = p.x + p.w / 2 > G.teddy.x ? 1 : -1;
    G.teddy.cheer = Math.max(0, G.teddy.cheer - dt);
    G.teddy.hop = save.settings.reducedMotion ? 0 : Math.max(0, Math.sin(G.time * 3)) * 4 + (G.teddy.cheer > 0 ? Math.abs(Math.sin(G.time * 9)) * 16 : 0);
  }

  function rectCircle(r, cx, cy, rad) {
    var nx = Math.max(r.x, Math.min(cx, r.x + r.w)), ny = Math.max(r.y, Math.min(cy, r.y + r.h));
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < rad * rad;
  }

  function update(dt) {
    G.time += dt;
    if (!G.level) return;
    if (G.mode === 'menu' || G.mode === 'tutorial') {
      updateWorldBits(dt);
      if (G.mode === 'menu') { G.player.x = 820; G.player.facing = -1; }
      return;
    }
    if (G.mode !== 'playing') {
      // Keep scenery gently alive behind pause/challenge/complete screens.
      if (G.mode === 'complete') { G.teddy.cheer = 1; }
      return;
    }
    updateWorldBits(dt);
    var L = G.level, p = G.player;

    if (G.hurtTimer > 0) {
      G.hurtTimer -= dt;
      if (G.hurtTimer <= 0) { placeAtCheckpoint(); G.invuln = 1.2; }
      G.camX += (targetCam() - G.camX) * Math.min(1, dt * 6);
      return;
    }
    if (G.winTimer > 0) {
      G.winTimer -= dt;
      if (!save.settings.reducedMotion && Math.random() < 0.5) burst(G.camX + Math.random() * 1280, -10, 2, 'confetti', ['#ffd23f', '#e63946', '#2453c4', '#2fbf71', '#ffffff']);
      if (G.winTimer <= 0) showComplete();
      return;
    }
    G.invuln = Math.max(0, G.invuln - dt);

    var events = Physics.step(p, Input.read(), L, dt);
    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      if (ev === 'jump') Audio.play('jump');
      else if (ev === 'land' && !save.settings.reducedMotion) burst(p.x + p.w / 2, p.y + p.h, 4, 'confetti', ['#d9c7a5']);
      else if (ev.type === 'gateTouch' && !ev.gate.open && G.mode === 'playing') { openChallenge(ev.gate); return; }
    }
    G.runPhase += Math.abs(p.vx) * dt * 0.045;

    // Footballs
    var cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    L.footballs.forEach(function (b) {
      if (b.taken) return;
      if (Math.abs(b.x - cx) < p.w / 2 + 14 && Math.abs(b.y - cy) < p.h / 2 + 14) {
        b.taken = true;
        G.am.collected.push(b.i);
        G.am.runCoins += C.REWARDS.football;
        save.player.coins += C.REWARDS.football;
        save.player.lifetimeCoins += C.REWARDS.football;
        save.player.footballs += 1;
        Audio.play('coin');
        floatText(b.x, b.y - 10, '+' + C.REWARDS.football);
        burst(b.x, b.y, 5, 'star', ['#ffd23f', '#ffffff']);
        updateHud(true);
        markDirty();
      }
    });

    // Hazards (forgiving hit boxes)
    if (G.invuln <= 0) {
      var box = { x: p.x + 6, y: p.y + 8, w: p.w - 12, h: p.h - 10 };
      var hit = L.cones.some(function (c) { return Physics.overlap(box, { x: c.x - 11, y: c.y - 32, w: 22, h: 32 }); }) ||
        L.drones.some(function (d) { return rectCircle(box, d.x, d.y, d.r - 5); });
      if (hit) { hurt(); return; }
    }
    if (p.y > 760) { hurt(true); return; }

    // Checkpoints
    L.checkpoints.forEach(function (c) {
      if (c.i > G.am.checkpoint && cx >= c.x && Math.abs((p.y + p.h) - c.y) < 160) {
        L.checkpoints.forEach(function (k) { if (k.i <= c.i) k.reached = true; });
        G.am.checkpoint = c.i;
        Audio.play('checkpoint');
        UI.toast('✓ Checkpoint! Progress saved', 1.8);
        burst(c.x + 20, c.y - 70, 8, 'star', ['#2fbf71', '#ffffff']);
        saveNow();
      }
    });

    // Hints (until the mission has been completed once)
    if (!save.missions[G.missionId].completed && L.hints) {
      L.hints.forEach(function (h, i) {
        if (!G.hintsShown[i] && cx >= h.x) { G.hintsShown[i] = true; UI.teddySay(h.text, 6); }
      });
    }

    // Goal
    if (!G.completed && cx >= L.goal.x + 30) win();

    G.camX += (targetCam() - G.camX) * Math.min(1, dt * 6);
    updateHud(false);
  }

  function hurt(fell) {
    G.hurtTimer = fell ? 0.6 : 0.9;
    G.player.vx = 0;
    Audio.play('bonk');
    UI.teddySay(fell ? 'Whoops! Back to the flag - you kept all your coins.' : 'Bonk! No problem - back to the flag. Your coins are safe.', 3.5);
  }

  function updateHud(bump) {
    $('hud-coins').textContent = save.player.coins;
    if (bump) {
      var el = document.querySelector('.coins');
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    }
    if (!G.level || !G.player) return;
    var L = G.level;
    var idx = -1;
    for (var i = 0; i < L.gates.length; i++) if (!L.gates[i].open) { idx = i; break; }
    $('hud-objective').textContent = idx >= 0
      ? 'Next: open Maths Gate ' + (idx + 1) + ' of ' + L.gates.length
      : 'Next: run to the goal and score!';
    var start = L.checkpoints[0].x, end = L.goal.x + 30;
    var pct = Math.max(0, Math.min(1, (G.player.x - start) / (end - start)));
    $('hud-progress').style.width = (pct * 100) + '%';
    $('hud-progress-ball').style.left = (pct * 300) + 'px';
  }

  // ---------------- Maths challenge ----------------
  function openChallenge(gate) {
    G.mode = 'challenge';
    Input.enabled = false; Input.clear();
    G.gate = gate;
    $('touch').classList.add('hidden');
    UI.teddyHide();
    newQuestion();
    UI.show('challenge');
  }

  function newQuestion() {
    var pool = Maths.poolKeys(G.def.tables, G.def.maxOther);
    var pick = Learning.pickFact(save.learning, pool);
    Learning.noteShown(save.learning, pick.key);
    G.ch = Challenge.createChallenge(G.gate.id, pick.key);
    var f = save.learning.facts[G.ch.key];
    G.factBefore = f ? { attempts: f.attempts, mastery: f.mastery } : null;
    G.chState = 'asking';
    renderChallenge();
  }

  function renderChallenge() {
    var ch = G.ch, L = G.level;
    var gi = L.gates.indexOf(G.gate);
    $('ch-label').textContent = 'Maths Gate ' + (gi + 1) + ' of ' + L.gates.length;
    $('ch-question').textContent = ch.a + ' × ' + ch.b + ' = ?';
    G.typed = '';
    showTyped();
    var box = $('ch-options');
    box.innerHTML = '';
    ch.options.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn'; b.textContent = String(v);
      b.setAttribute('data-value', String(v));
      b.addEventListener('click', function () { submitAnswer(v, b); });
      box.appendChild(b);
    });
    $('ch-feedback').textContent = ''; $('ch-feedback').className = 'ch-feedback';
    $('ch-explain').classList.add('hidden');
    box.classList.remove('hidden');
    $('ch-entry').classList.remove('hidden');
    setActions([{ label: 'Step back', fn: stepBack }]);
    UI.portrait('ch-teddy', 'teddy', { t: G.time });
    setTimeout(function () { var first = box.querySelector('button'); if (first) first.focus(); }, 30);
  }

  function showTyped() {
    var el = $('ch-entry');
    el.textContent = G.typed ? G.typed : 'Type the answer or click one';
    el.classList.toggle('typed', !!G.typed);
  }

  function setActions(list) {
    var row = $('ch-actions');
    row.innerHTML = '';
    list.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn' + (a.primary ? ' primary' : ' small');
      b.textContent = a.label;
      b.addEventListener('click', a.fn);
      if (a.id) b.id = a.id;
      row.appendChild(b);
    });
  }

  function submitAnswer(value, btn) {
    if (G.mode !== 'challenge' || G.chState !== 'asking') return;
    var ch = G.ch;
    var r = Challenge.submit(ch, value);
    if (r.status === 'invalid' || r.status === 'ignored') return;
    var buttons = Array.prototype.slice.call($('ch-options').querySelectorAll('button'));
    if (!btn) btn = buttons.filter(function (b) { return b.getAttribute('data-value') === String(parseInt(value, 10)); })[0] || null;
    buttons.forEach(function (b) { b.disabled = true; });

    if (r.status === 'correct') {
      G.chState = 'solved';
      Learning.recordAnswer(save.learning, ch.a, ch.b, true, r.firstTry);
      var amt = Rewards.gateAmount(ch.a, ch.b, G.factBefore, save.learning.streak);
      var paid = Rewards.pay(save, 'gate:' + G.am.runId + ':' + G.gate.id, amt.total);
      if (paid.paid) G.am.runCoins += paid.amount;
      G.gate.open = true;
      if (G.am.gatesOpened.indexOf(G.gate.id) === -1) G.am.gatesOpened.push(G.gate.id);
      buttons.forEach(function (b) { if (b.getAttribute('data-value') === String(ch.answer)) b.classList.add('right'); });
      var fb = $('ch-feedback');
      fb.className = 'ch-feedback good';
      fb.textContent = '✓ ' + pickPraise() + ' ' + ch.a + ' × ' + ch.b + ' = ' + ch.answer +
        (paid.paid ? '   +' + paid.amount + ' coins' + (amt.streakBonus ? ' (streak bonus!)' : '') : '');
      $('ch-explain').classList.add('hidden');
      Audio.play('correct');
      UI.portrait('ch-teddy', 'teddy', { t: G.time, cheer: true });
      updateHud(true);
      saveNow();
      setActions([{ label: 'Continue ▶', primary: true, fn: closeChallenge, id: 'ch-continue' }]);
      setTimeout(function () { var c = $('ch-continue'); if (c) c.focus(); }, 30);
    } else {
      G.chState = 'wrong';
      Learning.recordAnswer(save.learning, ch.a, ch.b, false, false);
      if (btn) btn.classList.add('wrong');
      // Swap the answer buttons for the counting picture (keeps the panel on screen).
      $('ch-options').classList.add('hidden');
      $('ch-entry').classList.add('hidden');
      var ex = r.explanation;
      var fb2 = $('ch-feedback');
      fb2.className = 'ch-feedback kind';
      fb2.textContent = 'Nice try! ' + parseInt(value, 10) + ' isn’t quite it – let’s count it together.';
      $('ch-explain').classList.remove('hidden');
      UI.drawArray('ch-array', ch.a, ch.b);
      $('ch-sentence').textContent = ch.a + ' × ' + ch.b + ' = ' + ch.answer + '  —  ' + ex.sentence;
      $('ch-skip').textContent = 'Count up in ' + ch.b + 's: ' + ex.skipCount;
      Audio.play('wrong');
      markDirty();
      setActions([
        { label: 'Try again', primary: true, fn: retryQuestion, id: 'ch-retry' },
        { label: 'New question', fn: function () { newQuestion(); } }
      ]);
      setTimeout(function () { var c = $('ch-retry'); if (c) c.focus(); }, 30);
    }
  }

  var PRAISE = ['Brilliant!', 'Great shot!', 'Top bins!', 'Superb!', 'Fantastic!', 'Back of the net!'];
  function pickPraise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }

  function retryQuestion() {
    if (G.chState !== 'wrong') return;
    Challenge.retry(G.ch);
    G.chState = 'asking';
    renderChallenge();
  }

  function stepBack() {
    if (G.chState === 'solved') return closeChallenge();
    G.chState = 'idle';
    G.player.x = Math.max(0, G.gate.x - G.player.w - 70);
    G.player.vx = 0;
    beginPlay();
    UI.teddySay('Take your time. Walk into the gate when you\'re ready.', 4);
  }

  function closeChallenge() {
    if (G.mode !== 'challenge' || G.chState !== 'solved') return;
    G.chState = 'idle';
    Audio.play('gate');
    burst(G.gate.x + 25, G.gate.y - 200, 14, 'star', ['#ffd23f', '#2fbf71', '#ffffff']);
    G.teddy.cheer = 1.5;
    beginPlay();
    var left = G.level.gates.filter(function (g) { return !g.open; }).length;
    UI.teddySay(left ? 'Gate open! ' + left + ' more to go.' : 'Gate open! Now run to the goal!', 4);
    updateHud();
  }

  // ---------------- Winning ----------------
  function win() {
    G.completed = true;
    G.winTimer = save.settings.reducedMotion ? 1.2 : 2.6;
    G.player.vx = 0;
    var res = Rewards.completeMission(save, G.missionId, G.am.runId);
    G.winResult = { res: res, runCoins: G.am.runCoins, balls: G.am.collected.length, totalBalls: G.level.footballs.length };
    var m = save.missions[G.missionId];
    m.bestCoins = Math.max(m.bestCoins, G.am.runCoins + (res.amount || 0));
    save.activeMission = null;
    saveNow();
    Audio.play('complete');
    G.teddy.cheer = 3;
    UI.teddySay(G.missionId === 'sky' ? 'You did it! The Sky Cup is ours!' : 'GOOOAL! What a finish!', 3);
    burst(G.level.goal.x + 85, G.level.goal.y - 60, 30, 'confetti', ['#ffd23f', '#e63946', '#2453c4', '#2fbf71', '#ffffff']);
    updateHud(true);
  }

  function showComplete() {
    G.mode = 'complete';
    Input.enabled = false; Input.clear();
    $('touch').classList.add('hidden');
    UI.teddyHide();
    var w = G.winResult, res = w.res;
    var isFinal = G.missionId === 'sky';
    $('cm-title').textContent = isFinal ? 'You won the Sky Cup!' : 'GOAL! ' + G.def.name + ' complete!';
    var items = [];
    items.push('<li><span class="cm-coin"></span> Coins this mission: <b>' + (w.runCoins + (res.amount || 0)) + '</b></li>');
    items.push('<li>⚽ Footballs collected: <b>' + w.balls + ' of ' + w.totalBalls + '</b></li>');
    if (res.paid) items.push('<li>Mission reward: <b>+' + res.amount + '</b>' + (res.firstClear ? ' (includes first-time bonus!)' : '') + '</li>');
    if (res.firstClear && res.badge) items.push('<li>New badge: <span class="badge">★ ' + res.badge + '</span></li>');
    var next = C.MISSIONS[C.MISSIONS.indexOf(G.def) + 1];
    if (res.firstClear && next) items.push('<li>Unlocked: <b>' + next.name + '</b>!</li>');
    if (isFinal) items.push('<li>Champion of all three missions! Play again any time to practise.</li>');
    items.push('<li>Total coins: <b>' + save.player.coins + '</b></li>');
    $('cm-list').innerHTML = items.join('');

    var row = $('cm-actions');
    row.innerHTML = '';
    function add(label, fn, primary) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn' + (primary ? ' primary' : '');
      b.textContent = label; b.addEventListener('click', fn); row.appendChild(b);
    }
    if (next && save.missions[next.id].unlocked) add('Next: ' + next.name + ' ▶', function () { startMission(next.id, false); }, true);
    var id = G.missionId;
    add('Play again', function () { startMission(id, false); }, !next);
    add('Missions', function () { leaveToMenu('missions'); });
    UI.show('complete');
  }

  function drawCompleteArt() {
    var c = $('cm-art'), x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.save(); x.translate(130, 196); x.scale(1.45, 1.45); x.translate(-130, -196);
    if (G.missionId === 'sky') Render.drawTrophy(x, 172, 122, 1.0);
    Render.drawHero(x, 95, 196, { facing: 1, t: G.time, win: true });
    Render.drawTeddy(x, 172, 196, { facing: -1, t: G.time, cheer: true, hop: save.settings.reducedMotion ? 0 : Math.abs(Math.sin(G.time * 6)) * 12 });
    x.restore();
  }

  // ---------------- Pause ----------------
  function pause() {
    if (G.mode !== 'playing') return;
    G.mode = 'paused';
    Input.enabled = false; Input.clear();
    applySettings();
    UI.show('pause');
  }
  function resume() {
    if (G.mode !== 'paused') return;
    beginPlay();
  }

  // ---------------- Tutorial ----------------
  var TUTORIAL = [
    { title: 'Run!', text: 'Use ← → or A and D to run.' },
    { title: 'Jump!', text: 'Press Space or ↑ to jump. Hold it for a bigger jump.' },
    { title: 'Grab footballs', text: 'Every football gives you a coin. Bumped by a cone or drone? You pop back to the last flag – and keep your coins.' },
    { title: 'Maths Gates', text: 'Walk into a Maths Gate and answer the times-table question to open it. Wrong answers never lose coins!' }
  ];
  var tutIdx = 0;
  function openTutorial() {
    G.mode = 'tutorial';
    tutIdx = 0;
    renderTutorial();
    UI.show('tutorial', 'tutorial-next');
  }
  function renderTutorial() {
    var t = TUTORIAL[tutIdx];
    $('tutorial-title').textContent = t.title;
    $('tutorial-text').textContent = t.text;
    $('tutorial-step').textContent = 'Tip ' + (tutIdx + 1) + ' of ' + TUTORIAL.length + '  •  press Enter';
    $('tutorial-next').textContent = tutIdx === TUTORIAL.length - 1 ? 'Let’s play! ▶' : 'Next ▶';
  }
  function drawTutorialArt() {
    var c = $('tutorial-art'), x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = '#bfeaff'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#3bb54a'; x.fillRect(0, 120, c.width, 30);
    var t = G.time;
    if (tutIdx === 0) {
      var px = 120 + ((t * 80) % 140);
      Render.drawHero(x, px, 122, { facing: 1, run: t * 12, speed: 300, t: t });
    } else if (tutIdx === 1) {
      var jy = Math.abs(Math.sin(t * 2.5)) * 50;
      Render.drawHero(x, 180, 122 - jy, { facing: 1, air: jy > 2, vy: Math.cos(t * 2.5) > 0 ? -1 : 1, t: t });
    } else if (tutIdx === 2) {
      Render.drawHero(x, 110, 122, { facing: 1, t: t, happy: true });
      for (var i = 0; i < 3; i++) Render.drawFootball(x, 190 + i * 45, 85 + Math.sin(t * 3 + i) * 4, 13, t + i);
    } else {
      Render.drawHero(x, 110, 122, { facing: 1, t: t });
      x.fillStyle = '#ffd23f'; x.strokeStyle = '#1b1b2f'; x.lineWidth = 3;
      x.fillRect(200, 20, 110, 100); x.strokeRect(200, 20, 110, 100);
      x.fillStyle = '#1b1b2f'; x.font = 'bold 28px "Trebuchet MS", sans-serif'; x.textAlign = 'center';
      x.fillText('3 × 4', 255, 62); x.fillText('= ?', 255, 98);
    }
    Render.drawTeddy(x, 50, 124, { facing: 1, t: t, cheer: tutIdx === 3 });
  }
  function nextTutorial() {
    if (G.mode !== 'tutorial') return;
    tutIdx++;
    if (tutIdx >= TUTORIAL.length) return finishTutorial();
    renderTutorial();
  }
  function finishTutorial() {
    save.tutorialSeen = true;
    saveNow();
    beginPlay();
    var h = G.level.hints && G.level.hints[0];
    if (h) { G.hintsShown[0] = true; UI.teddySay(h.text, 6); }
  }

  // ---------------- Menu screens ----------------
  var backStack = [];
  function openTitle() {
    G.mode = 'menu';
    var prog = hasProgress();
    $('btn-continue').disabled = !prog;
    $('btn-continue').classList.toggle('primary', prog);
    $('btn-new').classList.toggle('primary', !prog);
    $('title-stats').textContent = prog ? 'Coins: ' + save.player.coins + '   •   Badges: ' + save.player.badges.length + ' of ' + C.MISSIONS.length : '';
    backStack = [];
    UI.show('title', prog ? 'btn-continue' : 'btn-new');
  }
  function openSub(name, from) {
    backStack.push(from || UI.currentScreen());
    UI.show(name);
  }
  function goBack() {
    var prev = backStack.pop();
    if (prev === 'pause') { UI.show('pause'); return; }
    if (prev === 'settings') { UI.show('settings'); return; }
    if (prev === 'missions') { openMissions(); return; }
    openTitle();
  }

  function openMissions() {
    G.mode = 'menu';
    var list = $('mission-list');
    list.innerHTML = '';
    C.MISSIONS.forEach(function (m, i) {
      var st = save.missions[m.id];
      var active = save.activeMission && save.activeMission.id === m.id;
      var card = document.createElement('div');
      card.className = 'mission-card' + (st.unlocked ? '' : ' locked');
      var status = !st.unlocked ? '🔒 Locked – finish ' + C.MISSIONS[i - 1].name + ' first'
        : active ? '▶ In progress – carry on from your flag'
          : st.completed ? '✓ Completed – badge: ' + m.badge
            : '★ Ready to play!';
      card.innerHTML = '<div class="thumb ' + m.id + '"><span>' + m.short + '</span></div>' +
        '<div class="info"><h3></h3><p></p><div class="status"></div></div>';
      card.querySelector('h3').textContent = m.name;
      card.querySelector('p').textContent = m.blurb;
      card.querySelector('.status').textContent = status;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn' + (st.unlocked && !st.completed ? ' primary' : '');
      b.textContent = !st.unlocked ? 'Locked' : active ? 'Continue' : st.completed ? 'Play again' : 'Play';
      b.disabled = !st.unlocked;
      b.addEventListener('click', function () { startMission(m.id, !!active); });
      card.querySelector('.info').appendChild(b);
      list.appendChild(card);
    });
    if (UI.currentScreen() !== 'missions') {
      if (UI.currentScreen() === 'title') backStack.push('title');
    }
    UI.show('missions');
  }

  function continueGame() {
    if (save.activeMission) startMission(save.activeMission.id, true);
    else { backStack.push('title'); openMissions(); }
  }

  function newGame() {
    if (!hasProgress()) { startMission('training', false); return; }
    confirmBox('Start a brand-new game?',
      'This clears coins, badges and missions. A grown-up can undo it in Settings → Grown-ups.',
      'Yes, start fresh', function () { resetProgress(); startMission('training', false); }, 'title');
  }

  var confirmYes = null, confirmFrom = null;
  function confirmBox(title, text, yesLabel, onYes, from) {
    $('cf-title').textContent = title;
    $('cf-text').textContent = text;
    $('cf-yes').textContent = yesLabel;
    confirmYes = onYes; confirmFrom = from;
    UI.show('confirm', 'cf-no');
  }

  function resetProgress() {
    try { storage.write(RESET_COPY, JSON.stringify(save)); } catch (e) { /* best effort */ }
    var keepSettings = save.settings;
    save = MB.Save.defaultSave();
    save.settings = keepSettings;
    save.tutorialSeen = true;
    G.settings = save.settings;
    saveNow();
  }

  // ---------------- Grown-ups ----------------
  function openGrownups() {
    backStack.push('settings');
    renderGrownups();
    UI.show('grownups');
  }
  function renderGrownups() {
    $('gu-storage').textContent = 'Progress is saved as: ' + storage.kind + (storage.location ? ' — ' + storage.location : '');
    $('gu-saved').textContent = 'Last saved: ' + (save.savedAt ? new Date(save.savedAt).toLocaleString('en-GB') : 'not yet') +
      (loaded.recovered ? '  (a damaged save was found and safely recovered from the ' + loaded.source + ' copy)' : '');
    $('gu-open').classList.toggle('hidden', !storage.dir);
    var hasReset = false;
    try { hasReset = !!storage.read(RESET_COPY); } catch (e) { /* ignore */ }
    $('gu-restore').textContent = hasReset ? 'Undo last reset' : 'Restore previous save';
    var rows = Learning.tableSummary(save.learning);
    $('gu-summary').innerHTML = rows.map(function (r) {
      var pct = r.attempts ? Math.round(r.correct / r.attempts * 100) + '% right' : 'not yet';
      return '<div><b>' + r.table + '×</b>' + r.attempts + (r.attempts === 1 ? ' try' : ' tries') + '<br>' + pct + '</div>';
    }).join('');
    $('gu-updates').textContent = save.updates.status + '. Automatic downloads are switched off (see docs/CONTENT_UPDATES.md).';
    $('gu-version').textContent = 'MathBots version ' + C.VERSION + ' • save format v' + C.SAVE_SCHEMA_VERSION + ' • no accounts, no tracking, no internet needed.';
  }
  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }
  function exportBackup() {
    saveNow();
    var text = saver.exportText(save);
    var name = 'progress-' + stamp() + '.json';
    try {
      if (storage.writeExtra) {
        var where = storage.writeExtra('backups/' + name, text);
        $('gu-message').textContent = 'Backup saved: ' + where;
      } else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        a.download = 'mathbots-' + name;
        document.body.appendChild(a); a.click(); a.remove();
        $('gu-message').textContent = 'Backup file downloaded (mathbots-' + name + ').';
      }
    } catch (e) { $('gu-message').textContent = 'Backup failed: ' + e.message; }
  }
  function restorePrevious() {
    var data = null;
    try {
      var resetText = storage.read(RESET_COPY);
      if (resetText) {
        data = saver.importText(resetText);
        if (data) storage.write(RESET_COPY + '.used', resetText);
        storage.write(RESET_COPY, '');
      }
    } catch (e) { data = null; }
    if (!data) data = saver.restoreBackup();
    if (!data) { $('gu-message').textContent = 'There is no earlier save to restore.'; return; }
    save = data; G.settings = save.settings;
    saveNow();
    applySettings();
    $('gu-message').textContent = 'Restored. Coins: ' + save.player.coins + ', badges: ' + save.player.badges.length + '.';
    renderGrownups();
  }

  // ---------------- Wiring ----------------
  function on(id, fn) { $(id).addEventListener('click', function (e) { Audio.unlock(); fn(e); }); }
  on('btn-continue', continueGame);
  on('btn-new', newGame);
  on('btn-missions', function () { backStack.push('title'); openMissions(); });
  on('btn-controls', function () { openSub('controls'); });
  on('btn-settings', function () { openSub('settings'); });
  on('btn-title-sound', function () { toggleSetting('muted'); });
  on('btn-hud-sound', function (e) { toggleSetting('muted'); e.currentTarget.blur(); });
  on('btn-hud-pause', function (e) { e.currentTarget.blur(); pause(); });
  on('set-sound', function () { toggleSetting('muted'); });
  on('set-motion', function () { toggleSetting('reducedMotion'); });
  on('set-contrast', function () { toggleSetting('highContrast'); });
  on('set-touch', function () { toggleSetting('touchButtons'); });
  on('pause-sound', function () { toggleSetting('muted'); });
  on('pause-motion', function () { toggleSetting('reducedMotion'); });
  on('pause-resume', resume);
  on('pause-checkpoint', function () { G.mode = 'playing'; placeAtCheckpoint(); beginPlay(); });
  on('pause-missions', function () { leaveToMenu('missions'); });
  on('pause-title', function () { leaveToMenu('title'); });
  on('tutorial-next', nextTutorial);
  on('tutorial-skip', finishTutorial);
  on('cf-no', function () { if (confirmFrom === 'grownups') UI.show('grownups'); else openTitle(); });
  on('cf-yes', function () { var f = confirmYes; confirmYes = null; if (f) f(); });
  on('gu-export', exportBackup);
  on('gu-open', function () { try { nw.Shell.openItem(storage.dir); } catch (e) { $('gu-message').textContent = storage.dir; } });
  on('gu-restore', restorePrevious);
  on('gu-reset', function () {
    confirmBox('Reset all progress?', 'Coins, badges, missions and practice records will be cleared. A copy is kept so you can undo it.',
      'Yes, reset', function () { resetProgress(); applySettings(); UI.show('grownups'); renderGrownups(); $('gu-message').textContent = 'Progress reset. Use "Undo last reset" to bring it back.'; }, 'grownups');
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) { b.addEventListener('click', goBack); });
  UI.holdButton($('btn-grownups'), 1500, openGrownups);
  Input.bindButton($('touch-left'), 'left');
  Input.bindButton($('touch-right'), 'right');
  Input.bindButton($('touch-jump'), 'jump');

  // Holding Enter must never click through several screens.
  window.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  Input.onKeyDown(function (e) {
    Audio.unlock();
    if (e.repeat && (e.key === 'Enter' || e.key === 'Escape')) return;
    var scr = UI.currentScreen();
    if (e.code === 'KeyM') { toggleSetting('muted'); UI.toast(save.settings.muted ? 'Sound off' : 'Sound on', 1.2); return; }

    if (e.key === 'Escape') {
      if (G.mode === 'playing') pause();
      else if (G.mode === 'paused') resume();
      else if (G.mode === 'challenge') { if (G.chState === 'solved') closeChallenge(); else stepBack(); }
      else if (scr === 'confirm') $('cf-no').click();
      else if (scr && scr !== 'title' && $('screen-' + scr).querySelector('[data-back]')) goBack();
      return;
    }

    if (G.mode === 'challenge') {
      var digit = /^(Digit|Numpad)([0-9])$/.exec(e.code);
      if (digit) {
        if (G.chState === 'wrong') retryQuestion();
        if (G.chState !== 'asking') return;
        if (G.typed.length < 3) G.typed += digit[2];
        showTyped();
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        e.preventDefault();
        return;
      }
      if (e.key === 'Backspace') { G.typed = G.typed.slice(0, -1); showTyped(); e.preventDefault(); return; }
      if (e.key === 'Enter' && G.typed && G.chState === 'asking') {
        e.preventDefault();
        submitAnswer(G.typed, null);
        G.typed = '';
        return;
      }
    }

    if (G.mode === 'tutorial' && e.key === 'Enter' && (!document.activeElement || document.activeElement.tagName !== 'BUTTON')) { nextTutorial(); return; }

    if (G.mode !== 'playing' && scr) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { if (UI.moveFocus(1)) e.preventDefault(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { if (UI.moveFocus(-1)) e.preventDefault(); }
    }
  });

  // Pause automatically if the window loses focus mid-game.
  window.addEventListener('blur', function () { if (G.mode === 'playing' && !DEBUG) pause(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { saveNow(); if (G.mode === 'playing' && !DEBUG) pause(); } });
  window.addEventListener('pagehide', saveNow);
  window.addEventListener('beforeunload', saveNow);
  try {
    if (typeof nw !== 'undefined' && nw.Window) {
      nw.Window.get().on('close', function () { try { saveNow(); } catch (e) { /* ignore */ } this.close(true); });
    }
  } catch (e) { /* not in NW.js */ }

  // ---------------- Main loop ----------------
  var last = performance.now(), acc = 0, errShown = false;
  function frame(now) {
    tick(now);
    requestAnimationFrame(frame);
  }
  function tick(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    refitIfNeeded();
    try {
      var steps = 0;
      while (acc >= STEP && steps < 6) { update(STEP); acc -= STEP; steps++; }
      if (steps === 6) acc = 0;
      if (G.level) Render.drawWorld(ctx, G);
      var scr = UI.currentScreen();
      if (scr === 'title') UI.portrait('title-portrait', 'hero', { t: G.time });
      else if (scr === 'tutorial') drawTutorialArt();
      else if (scr === 'complete') drawCompleteArt();
      UI.tick(dt);
    } catch (err) {
      if (!errShown) { errShown = true; console.error(err); UI.toast('Oops! Something went wrong. Try Pause → Title screen.', 5); }
    }
  }

  // ---------------- Start ----------------
  Input.enabled = false;
  setMenuScene('training');
  applySettings();
  UI.portrait('hud-avatar', 'hero-head', {});
  UI.portrait('teddy-face', 'teddy', {});
  openTitle();
  if (loaded.recovered) UI.toast(loaded.source === 'backup' ? 'Your save was restored from the backup copy.' : 'Starting a fresh save (the old one could not be read).', 4);
  MB.Updates.check(save.updates, null).then(function (r) { save.updates.status = r.status; });
  requestAnimationFrame(frame);

  if (DEBUG) {
    // Test harness only: keep the game ticking when the browser pauses animation frames (hidden tab).
    setInterval(function () { var n = performance.now(); if (n - last > 100) tick(n); }, 16);
    window.MB.debug = {
      G: G, get save() { return save; }, storage: storage,
      start: startMission, saveNow: saveNow,
      teleport: function (x, y) { G.player.x = x; if (y !== undefined) G.player.y = y; G.player.vx = 0; G.player.vy = 0; },
      answer: function (v) { submitAnswer(v === undefined ? G.ch.answer : v, null); },
      state: function () { return { mode: G.mode, chState: G.chState, x: Math.round(G.player.x), y: Math.round(G.player.y), coins: save.player.coins, cp: G.am && G.am.checkpoint, gates: G.am && G.am.gatesOpened.slice() }; }
    };
  }
})();
