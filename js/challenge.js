/* A single maths challenge at a gate. Once solved it ignores every further
 * answer, which (with the reward ledger) guarantees exactly-once rewards. */
(function () {
  'use strict';
  var isNode = typeof module === 'object' && module.exports && typeof window === 'undefined';
  var Maths = isNode ? require('./maths.js') : window.MB.Maths;

  function createChallenge(id, key, rng) {
    var q = Maths.makeQuestion(key, rng);
    return {
      id: id, key: q.key, a: q.a, b: q.b, answer: q.answer, options: q.options,
      state: 'open', attempts: 0, wrong: []
    };
  }

  // Same question again after a wrong answer (options reshuffled).
  function retry(ch, rng) {
    if (ch.state === 'solved') return ch;
    ch.options = Maths.shuffle(ch.options, rng || Math.random);
    return ch;
  }

  function submit(ch, value) {
    if (ch.state === 'solved') return { status: 'ignored' };
    var n = typeof value === 'number' ? value : parseInt(String(value).trim(), 10);
    if (!Number.isFinite(n)) return { status: 'invalid' };
    ch.attempts += 1;
    if (n === ch.answer) {
      ch.state = 'solved';
      return { status: 'correct', firstTry: ch.attempts === 1 && ch.wrong.length === 0, answer: ch.answer };
    }
    ch.wrong.push(n);
    return { status: 'wrong', answer: ch.answer, explanation: Maths.explain(ch.a, ch.b) };
  }

  var Challenge = { createChallenge: createChallenge, retry: retry, submit: submit };

  if (isNode) module.exports = Challenge;
  else (window.MB = window.MB || {}).Challenge = Challenge;
})();
