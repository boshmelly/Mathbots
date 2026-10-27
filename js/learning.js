/* Quiet adaptive practice. Tracks each fact locally and picks the next one
 * with a weighted mix of "needs practice", "developing" and "confident".
 * Nothing here is ever shown to the child as a grade or ranking. */
(function () {
  'use strict';
  var isNode = typeof module === 'object' && module.exports && typeof window === 'undefined';
  var Maths = isNode ? require('./maths.js') : window.MB.Maths;
  var Config = isNode ? require('./config.js') : window.MB.Config;

  var HISTORY_CAP = 40;

  function createLearning() {
    return { facts: {}, history: [], count: 0, streak: 0, bestStreak: 0 };
  }

  function getFact(learning, key) {
    var f = learning.facts[key];
    if (!f) {
      f = { attempts: 0, correct: 0, streak: 0, mastery: 0, last: -1, miss: false };
      learning.facts[key] = f;
    }
    return f;
  }

  // Which practice group a fact belongs to.
  function bucketOf(f) {
    if (!f || f.attempts === 0) return 'developing'; // brand-new facts are introduced steadily
    if (f.miss || f.mastery < 0.4) return 'low';
    if (f.mastery < 0.8) return 'developing';
    return 'confident';
  }

  function recordAnswer(learning, a, b, correct, firstTry) {
    var key = Maths.factKey(a, b);
    var f = getFact(learning, key);
    f.attempts += 1;
    if (correct) {
      f.correct += 1;
      f.streak += 1;
      f.mastery = f.mastery + (1 - f.mastery) * (firstTry ? 0.35 : 0.12);
      if (f.streak >= 2) f.miss = false;
      learning.streak += 1;
      if (learning.streak > learning.bestStreak) learning.bestStreak = learning.streak;
    } else {
      f.streak = 0;
      f.mastery = Math.max(0, f.mastery * 0.5 - 0.05);
      f.miss = true;
      learning.streak = 0;
    }
    f.mastery = Math.round(f.mastery * 1000) / 1000;
    f.last = learning.count;
    learning.count += 1;
    if (learning.history[learning.history.length - 1] !== key) {
      learning.history.push(key);
      if (learning.history.length > HISTORY_CAP) learning.history.splice(0, learning.history.length - HISTORY_CAP);
    }
    return f;
  }

  // Note that a fact was shown (so the next pick avoids it) without scoring it.
  function noteShown(learning, key) {
    if (learning.history[learning.history.length - 1] !== key) {
      learning.history.push(key);
      if (learning.history.length > HISTORY_CAP) learning.history.splice(0, learning.history.length - HISTORY_CAP);
    }
  }

  function weightedPick(items, weights, rng) {
    var total = 0;
    for (var i = 0; i < weights.length; i++) total += weights[i];
    var r = rng() * total;
    for (var j = 0; j < items.length; j++) {
      r -= weights[j];
      if (r < 0) return items[j];
    }
    return items[items.length - 1];
  }

  // Pick the next fact key from a pool.
  function pickFact(learning, pool, rng, mix) {
    rng = rng || Math.random;
    mix = mix || Config.MIX;
    var windowSize = Config.NO_REPEAT_WINDOW;

    // Also revisit facts from any table that were recently missed.
    var candidatesAll = pool.slice();
    Object.keys(learning.facts).forEach(function (k) {
      var f = learning.facts[k];
      if (f.miss && candidatesAll.indexOf(k) === -1) candidatesAll.push(k);
    });

    var recent = learning.history.slice(-windowSize);
    var candidates = candidatesAll.filter(function (k) { return recent.indexOf(k) === -1; });
    if (candidates.length < 3) {
      // Small pool: at least never repeat the last two.
      var last = learning.history.slice(-2);
      candidates = candidatesAll.filter(function (k) { return last.indexOf(k) === -1; });
    }
    if (candidates.length === 0) candidates = candidatesAll;

    var buckets = { low: [], developing: [], confident: [] };
    candidates.forEach(function (k) { buckets[bucketOf(learning.facts[k])].push(k); });

    var names = ['low', 'developing', 'confident'].filter(function (n) { return buckets[n].length > 0; });
    var bucket = weightedPick(names, names.map(function (n) { return mix[n]; }), rng);

    var list = buckets[bucket];
    var weights = list.map(function (k) {
      var f = learning.facts[k];
      if (!f || f.attempts === 0) {
        // Gentle start: easier new facts are a little more likely.
        var p = Maths.parseKey(k);
        return 1 + (144 - p.a * p.b) / 144;
      }
      return 1 + (1 - f.mastery) + (f.miss ? 1 : 0);
    });
    return { key: weightedPick(list, weights, rng), bucket: bucket };
  }

  // Parent-facing summary per times table (never shown in child UI).
  function tableSummary(learning) {
    var rows = [];
    for (var t = 1; t <= 12; t++) {
      var att = 0, cor = 0;
      for (var o = 1; o <= 12; o++) {
        var f = learning.facts[Maths.factKey(t, o)];
        if (f) { att += f.attempts; cor += f.correct; }
      }
      rows.push({ table: t, attempts: att, correct: cor });
    }
    return rows;
  }

  var Learning = {
    createLearning: createLearning, getFact: getFact, bucketOf: bucketOf,
    recordAnswer: recordAnswer, noteShown: noteShown, pickFact: pickFact,
    tableSummary: tableSummary, HISTORY_CAP: HISTORY_CAP
  };

  if (isNode) module.exports = Learning;
  else (window.MB = window.MB || {}).Learning = Learning;
})();
