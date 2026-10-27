/* Level data for the three missions. Coordinates are in game pixels; y grows
 * downwards. A player can jump about 150px high and 240px far at full speed,
 * so gaps are kept under 170px and steps under 125px (tests check this). */
(function () {
  'use strict';
  var isNode = typeof module === 'object' && module.exports && typeof window === 'undefined';

  var G = 600; // main ground height
  var GATE_H = 400; // taller than any jump, so a gate must be opened

  function ground(x1, x2, y) { return { x: x1, y: y === undefined ? G : y, w: x2 - x1, h: 720 - (y === undefined ? G : y) + 40, kind: 'ground' }; }
  function island(x1, x2, y) { return { x: x1, y: y, w: x2 - x1, h: 70, kind: 'island' }; }
  function plat(x, y, w) { return { x: x, y: y, w: w, h: 22, kind: 'plat' }; }
  function mover(x, y, w, axis, range, speed) { return { x: x, y: y, w: w, h: 22, kind: 'mover', ox: x, oy: y, axis: axis, range: range, speed: speed, t: 0, dx: 0, dy: 0 }; }
  // A row/arc of footballs, centred above a surface top `y`.
  function balls(x, y, n, gap, arc) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var lift = arc ? Math.sin((i / Math.max(1, n - 1)) * Math.PI) * arc : 0;
      out.push({ x: x + i * gap, y: y - 40 - lift });
    }
    return out;
  }

  var DEFS = {
    training: {
      id: 'training', theme: 'training', width: 3900,
      solids: [ground(0, 1150), ground(1300, 2400), ground(2540, 3900)],
      platforms: [plat(480, 490, 190), plat(760, 400, 170), plat(1560, 480, 200), plat(2700, 480, 180)],
      movers: [],
      footballs: [].concat(
        balls(260, G, 4, 50), balls(515, 490, 3, 55), balls(790, 400, 3, 55),
        balls(1160, G - 30, 3, 55, 70), balls(1400, G, 3, 50), balls(1595, 480, 3, 60),
        balls(2290, G, 3, 40), balls(2420, G - 30, 3, 50, 70), balls(2735, 480, 3, 55),
        balls(3250, G, 5, 50)
      ),
      cones: [{ x: 1010, y: G }, { x: 1880, y: G }],
      drones: [{ x: 3060, y: 548, axis: 'x', range: 110, speed: 0.9 }],
      gates: [{ id: 'g1', x: 2200, y: G }],
      checkpoints: [{ x: 80, y: G }, { x: 1360, y: G }, { x: 2600, y: G }],
      goal: { x: 3640, y: G },
      hints: [
        { x: 0, text: 'Hi! I\'m Biscuit. Use ← → or A and D to run.' },
        { x: 300, text: 'Press Space or ↑ to jump up onto the platforms!' },
        { x: 880, text: 'Watch out for training cones – hop over them!' },
        { x: 1080, text: 'A gap! Run and jump across. If you fall, you go back to the flag.' },
        { x: 1700, text: 'Each football you grab gives you a coin.' },
        { x: 2000, text: 'A Maths Gate! Walk into it to answer a question and open it.' },
        { x: 2860, text: 'A silly training drone! Jump over it when it\'s close.' },
        { x: 3350, text: 'Nearly there – run to the goal to score!' }
      ]
    },

    neon: {
      id: 'neon', theme: 'neon', width: 5200,
      solids: [ground(0, 900), ground(1060, 1720), ground(1880, 2600), ground(2760, 3500), ground(3660, 4300), ground(4460, 5200)],
      platforms: [plat(420, 480, 160), plat(1200, 470, 150), plat(1420, 380, 150), plat(2000, 480, 180),
        plat(2240, 470, 140), plat(2950, 470, 170), plat(3200, 380, 150), plat(3800, 480, 160), plat(4600, 470, 170)],
      movers: [],
      footballs: [].concat(
        balls(200, G, 3, 50), balls(450, 480, 3, 50), balls(905, G - 30, 3, 55, 70),
        balls(1230, 470, 2, 60), balls(1450, 380, 3, 50), balls(1700, G - 30, 3, 55, 70),
        balls(2030, 480, 3, 55), balls(2265, 470, 2, 60), balls(2640, G - 30, 2, 70, 60),
        balls(2980, 470, 3, 55), balls(3230, 380, 3, 45), balls(3520, G - 30, 3, 55, 70),
        balls(3830, 480, 3, 45), balls(4320, G - 30, 2, 70, 60), balls(4630, 470, 3, 55), balls(4800, G, 3, 50)
      ),
      cones: [{ x: 3060, y: G }, { x: 4900, y: G }],
      drones: [
        { x: 660, y: 548, axis: 'x', range: 140, speed: 1.1 },
        { x: 1580, y: 470, axis: 'y', range: 90, speed: 1.2 },
        { x: 2180, y: 548, axis: 'x', range: 100, speed: 1.3 },
        { x: 3380, y: 470, axis: 'y', range: 90, speed: 1.3 },
        { x: 4000, y: 548, axis: 'x', range: 150, speed: 1.4 }
      ],
      gates: [{ id: 'g1', x: 2520, y: G }, { id: 'g2', x: 4200, y: G }],
      checkpoints: [{ x: 80, y: G }, { x: 1100, y: G }, { x: 1900, y: G }, { x: 2820, y: G }, { x: 3720, y: G }, { x: 4500, y: G }],
      goal: { x: 5000, y: G },
      hints: [
        { x: 0, text: 'Welcome to the Neon Stadium! The drones move in patterns – watch, then go.' },
        { x: 2350, text: 'Two Maths Gates in this mission. You\'ve got this!' },
        { x: 4700, text: 'Brilliant running! The goal is just ahead.' }
      ]
    },

    sky: {
      id: 'sky', theme: 'sky', width: 5650,
      solids: [ground(0, 700), island(860, 1250, 560), island(1400, 1700, 520), island(2150, 2700, 560),
        island(2860, 3150, 500), island(3300, 3550, 440), island(3800, 4300, 560), island(4450, 4700, 520), island(5000, 5650, 560)],
      platforms: [],
      movers: [mover(1760, 520, 140, 'x', 180, 0.7), mover(3640, 500, 140, 'y', 60, 0.8), mover(4760, 520, 140, 'x', 100, 0.8)],
      footballs: [].concat(
        balls(250, G, 4, 50), balls(720, G - 50, 3, 50, 50), balls(950, 560, 4, 50),
        balls(1450, 520, 4, 50), balls(1790, 470, 2, 60), balls(2250, 560, 4, 55),
        balls(2900, 500, 4, 55), balls(3340, 440, 3, 60), balls(3670, 400, 2, 60),
        balls(3880, 560, 4, 50), balls(4480, 520, 3, 60), balls(4790, 470, 2, 60), balls(5250, 560, 3, 50)
      ),
      cones: [{ x: 2450, y: 560 }, { x: 4000, y: 560 }],
      drones: [
        { x: 1080, y: 508, axis: 'x', range: 120, speed: 1.0 },
        { x: 2380, y: 508, axis: 'x', range: 90, speed: 1.2 },
        { x: 3010, y: 400, axis: 'y', range: 70, speed: 1.2 },
        { x: 4100, y: 508, axis: 'x', range: 70, speed: 1.4 },
        { x: 4580, y: 420, axis: 'y', range: 60, speed: 1.2 }
      ],
      gates: [{ id: 'g1', x: 2600, y: 560 }, { id: 'g2', x: 4200, y: 560 }, { id: 'g3', x: 5120, y: 560 }],
      checkpoints: [{ x: 80, y: G }, { x: 900, y: 560 }, { x: 2180, y: 560 }, { x: 3330, y: 440 }, { x: 3840, y: 560 }, { x: 5030, y: 560 }],
      goal: { x: 5450, y: 560 },
      hints: [
        { x: 0, text: 'The Sky Cup! Floating pitches and moving platforms – ride them across.' },
        { x: 1650, text: 'Stand on the moving platform and it carries you.' },
        { x: 4950, text: 'The last Maths Gate before the Sky Cup goal!' }
      ]
    }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // A fresh, mutable copy of a level for one play-through.
  function buildLevel(id) {
    var def = DEFS[id];
    if (!def) throw new Error('Unknown level ' + id);
    var L = clone(def);
    L.footballs.forEach(function (b, i) { b.i = i; b.taken = false; });
    L.gates.forEach(function (g) { g.w = 50; g.h = GATE_H; g.open = false; g.lift = 0; });
    L.drones.forEach(function (d, i) { d.ox = d.x; d.oy = d.y; d.r = 26; d.t = i * 1.3; });
    L.checkpoints.forEach(function (c, i) { c.i = i; c.reached = i === 0; });
    return L;
  }

  var Levels = { DEFS: DEFS, buildLevel: buildLevel, GATE_H: GATE_H, GROUND_Y: G };
  if (isNode) module.exports = Levels;
  else (window.MB = window.MB || {}).Levels = Levels;
})();
