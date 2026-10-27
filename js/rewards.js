/* Rewards and the exactly-once rule.
 * Every reward has a unique id (for example "gate:<run>:g1"). The ledger
 * remembers paid ids, so pressing Enter twice can never pay twice.
 * Nothing in this file ever takes coins away. */
(function () {
  'use strict';
  var isNode = typeof module === 'object' && module.exports && typeof window === 'undefined';
  var Config = isNode ? require('./config.js') : window.MB.Config;

  var LEDGER_CAP = 400;

  function pay(save, rewardId, amount) {
    if (!rewardId || !(amount > 0)) return { paid: false, amount: 0 };
    if (save.ledger.indexOf(rewardId) !== -1) return { paid: false, amount: 0 };
    save.ledger.push(rewardId);
    if (save.ledger.length > LEDGER_CAP) save.ledger.splice(0, save.ledger.length - LEDGER_CAP);
    save.player.coins += Math.floor(amount);
    save.player.lifetimeCoins += Math.floor(amount);
    return { paid: true, amount: Math.floor(amount) };
  }

  // Coins for a correct gate answer. `fact` is the learning record before the answer.
  function gateAmount(a, b, factBefore, streakAfter) {
    var R = Config.REWARDS;
    var amount = R.gateBase;
    if (!factBefore || factBefore.attempts === 0 || factBefore.mastery < 0.4) amount += R.gateLowMasteryBonus;
    if (a * b >= 50) amount += R.gateBigProductBonus;
    var streakBonus = (streakAfter > 0 && streakAfter % R.streakEvery === 0) ? R.streakBonus : 0;
    return { base: amount, streakBonus: streakBonus, total: amount + streakBonus };
  }

  // Pay mission completion once per run; the first clear also earns a badge.
  function completeMission(save, missionId, runId) {
    var R = Config.REWARDS;
    var m = save.missions[missionId];
    if (!m) return { paid: false, amount: 0, firstClear: false };
    var res = pay(save, 'mission:' + missionId + ':' + runId, R.missionComplete);
    if (!res.paid) return { paid: false, amount: 0, firstClear: false };
    var firstClear = !m.completed;
    var total = res.amount;
    if (firstClear) {
      var bonus = pay(save, 'firstclear:' + missionId, R.firstClearBonus);
      total += bonus.amount;
      m.completed = true;
    }
    m.completions += 1;
    // Unlock the next mission.
    var ids = Config.MISSIONS.map(function (x) { return x.id; });
    var next = ids[ids.indexOf(missionId) + 1];
    if (next && save.missions[next]) save.missions[next].unlocked = true;
    var badge = null;
    Config.MISSIONS.forEach(function (x) { if (x.id === missionId) badge = x.badge; });
    if (badge && save.player.badges.indexOf(badge) === -1) save.player.badges.push(badge);
    return { paid: true, amount: total, firstClear: firstClear, badge: badge, unlocked: next || null };
  }

  var Rewards = { pay: pay, gateAmount: gateAmount, completeMission: completeMission, LEDGER_CAP: LEDGER_CAP };

  if (isNode) module.exports = Rewards;
  else (window.MB = window.MB || {}).Rewards = Rewards;
})();
