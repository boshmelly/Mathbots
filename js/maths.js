/* Multiplication facts, question generation, distractors and explanations.
 * Pure functions: no DOM, no randomness unless an rng is passed in. */
(function () {
  'use strict';

  // Small seedable random generator (mulberry32) for repeatable tests.
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function multiply(a, b) { return a * b; }

  // Facts are stored order-free: 3x7 and 7x3 share one record "3x7".
  function factKey(a, b) {
    return a <= b ? a + 'x' + b : b + 'x' + a;
  }

  function parseKey(key) {
    var p = String(key).split('x');
    return { a: parseInt(p[0], 10), b: parseInt(p[1], 10) };
  }

  // All 78 distinct facts with factors 1..12.
  function allFactKeys() {
    var keys = [];
    for (var a = 1; a <= 12; a++) {
      for (var b = a; b <= 12; b++) keys.push(a + 'x' + b);
    }
    return keys;
  }

  // Facts for a mission: one factor from `tables`, the other 1..maxOther.
  function poolKeys(tables, maxOther) {
    var seen = {};
    var keys = [];
    tables.forEach(function (t) {
      for (var o = 1; o <= maxOther; o++) {
        var k = factKey(t, o);
        if (!seen[k]) { seen[k] = true; keys.push(k); }
      }
    });
    return keys;
  }

  // Three wrong options that are distinct, positive and never the answer.
  function makeDistractors(a, b, rng, count) {
    rng = rng || Math.random;
    count = count || 3;
    var answer = a * b;
    var ideas = [
      (a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1),
      answer + 1, answer - 1, answer + 10, answer - 10,
      a + b, answer + a, answer - b, answer + 2
    ];
    var picked = [];
    shuffle(ideas, rng).forEach(function (v) {
      if (picked.length < count && v > 0 && v !== answer && picked.indexOf(v) === -1) picked.push(v);
    });
    var guard = 0;
    while (picked.length < count && guard++ < 200) {
      var v = answer + randInt(rng, -12, 12);
      if (v > 0 && v !== answer && picked.indexOf(v) === -1) picked.push(v);
    }
    return picked;
  }

  // A question: shows "left x right", four shuffled options including the answer.
  function makeQuestion(key, rng) {
    rng = rng || Math.random;
    var f = parseKey(key);
    var flip = rng() < 0.5;
    var left = flip ? f.b : f.a;
    var right = flip ? f.a : f.b;
    var answer = multiply(left, right);
    var options = shuffle([answer].concat(makeDistractors(left, right, rng, 3)), rng);
    return { key: factKey(left, right), a: left, b: right, answer: answer, options: options };
  }

  function isCorrect(question, value) {
    var n = typeof value === 'number' ? value : parseInt(String(value).trim(), 10);
    return Number.isFinite(n) && n === question.answer;
  }

  // Kind, concrete explanation: "4 groups of 6 make 24".
  function explain(a, b) {
    var groupWord = a === 1 ? 'group' : 'groups';
    var counts = [];
    for (var i = 1; i <= a; i++) counts.push(b * i);
    return {
      sentence: a + ' ' + groupWord + ' of ' + b + ' make ' + (a * b) + '.',
      skipCount: counts.join(', ')
    };
  }

  var Maths = {
    makeRng: makeRng, randInt: randInt, shuffle: shuffle, multiply: multiply,
    factKey: factKey, parseKey: parseKey, allFactKeys: allFactKeys, poolKeys: poolKeys,
    makeDistractors: makeDistractors, makeQuestion: makeQuestion, isCorrect: isCorrect,
    explain: explain
  };

  if (typeof module === 'object' && module.exports && typeof window === 'undefined') {
    module.exports = Maths;
  } else {
    (window.MB = window.MB || {}).Maths = Maths;
  }
})();
