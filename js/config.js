/* MathBots: Kick-Off Quest - shared configuration.
 * Plain values only, so a parent can tweak numbers safely. */
(function () {
  'use strict';

  var Config = {
    VERSION: '1.0.0',
    SAVE_SCHEMA_VERSION: 1,

    // Logical game resolution. Everything is drawn at this size and scaled.
    VIEW_W: 1280,
    VIEW_H: 720,

    // Adaptive practice mix (percentages). Tune after play-testing.
    MIX: { low: 60, developing: 25, confident: 15 },
    // Try not to repeat a fact within this many recent questions.
    NO_REPEAT_WINDOW: 10,

    // Rewards (coins). Wrong answers never take coins away.
    REWARDS: {
      football: 1,
      gateBase: 5,
      gateLowMasteryBonus: 2,
      gateBigProductBonus: 1,
      streakEvery: 3,
      streakBonus: 3,
      missionComplete: 20,
      firstClearBonus: 30
    },

    // Missions. `tables` are the times tables used for gate questions;
    // `maxOther` is the largest other factor.
    MISSIONS: [
      {
        id: 'training', name: 'Training Ground', short: 'Mission 1',
        blurb: 'Learn to run, jump and open your first Maths Gate.',
        tables: [1, 2, 5, 10], maxOther: 10, badge: 'Training Star'
      },
      {
        id: 'neon', name: 'Neon Stadium', short: 'Mission 2',
        blurb: 'Dodge the silly training drones and crack two Maths Gates.',
        tables: [2, 3, 4, 5, 10, 11], maxOther: 12, badge: 'Neon Dribbler'
      },
      {
        id: 'sky', name: 'Sky Cup', short: 'Mission 3',
        blurb: 'Leap across floating pitches and win the Sky Cup!',
        tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], maxOther: 12, badge: 'Sky Cup Champion'
      }
    ],

    // Optional online content packs. OFF: empty URL means no network request
    // is ever made. See docs/CONTENT_UPDATES.md before changing.
    UPDATES: {
      manifestUrl: '',
      minHoursBetweenChecks: 48,
      timeoutMs: 4000
    },

    HERO_NAME: 'Noah',
    TEDDY_NAME: 'Biscuit'
  };

  if (typeof module === 'object' && module.exports && typeof window === 'undefined') {
    module.exports = Config;
  } else {
    (window.MB = window.MB || {}).Config = Config;
  }
})();
