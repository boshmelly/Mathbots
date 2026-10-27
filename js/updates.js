/* OPTIONAL online content packs - DISABLED by default.
 * With Config.UPDATES.manifestUrl === '' this module makes NO network request
 * and simply reports "Using built-in challenges". The game generates fresh
 * questions locally either way. See docs/CONTENT_UPDATES.md.
 *
 * If a parent later configures a trusted URL, packs must be JSON data only.
 * This module never downloads or runs JavaScript, HTML or programs.
 * (index.html's Content-Security-Policy also blocks network access via
 *  connect-src 'none'; that would need updating too.) */
(function () {
  'use strict';
  var isNode = typeof module === 'object' && module.exports && typeof window === 'undefined';
  var Config = isNode ? require('./config.js') : window.MB.Config;

  var BUILT_IN = 'Using built-in challenges';

  function isDue(lastCheckIso, now, minHours) {
    if (!lastCheckIso) return true;
    var t = Date.parse(lastCheckIso);
    if (!Number.isFinite(t)) return true;
    return (now - t) >= minHours * 3600 * 1000;
  }

  // A pack may only contain a title and a list of extra mission tip strings
  // or fact focus lists. Anything else is rejected.
  function validatePack(pack) {
    if (!pack || typeof pack !== 'object' || Array.isArray(pack)) return false;
    if (pack.format !== 'mathbots-pack-1') return false;
    if (typeof pack.title !== 'string' || pack.title.length > 80) return false;
    if (pack.tips && (!Array.isArray(pack.tips) || pack.tips.some(function (t) { return typeof t !== 'string' || t.length > 140 || /</.test(t); }))) return false;
    if (pack.focusTables && (!Array.isArray(pack.focusTables) || pack.focusTables.some(function (n) { return !Number.isInteger(n) || n < 1 || n > 12; }))) return false;
    return true;
  }

  // Returns a Promise that always resolves (never blocks play).
  function check(updatesState, fetchFn, now) {
    var url = Config.UPDATES.manifestUrl;
    now = now || Date.now();
    if (!url) return Promise.resolve({ status: BUILT_IN, requested: false });
    if (!isDue(updatesState.lastCheck, now, Config.UPDATES.minHoursBetweenChecks)) {
      return Promise.resolve({ status: BUILT_IN + ' (checked recently)', requested: false });
    }
    if (typeof fetchFn !== 'function') return Promise.resolve({ status: BUILT_IN, requested: false });
    var timer;
    var timeout = new Promise(function (resolve) {
      timer = setTimeout(function () { resolve(null); }, Config.UPDATES.timeoutMs);
    });
    var req = fetchFn(url, { credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .catch(function () { return null; });
    return Promise.race([req, timeout]).then(function (pack) {
      clearTimeout(timer);
      updatesState.lastCheck = new Date(now).toISOString();
      if (pack && validatePack(pack)) return { status: 'Extra pack ready: ' + pack.title, requested: true, pack: pack };
      return { status: BUILT_IN, requested: true };
    });
  }

  var Updates = { check: check, isDue: isDue, validatePack: validatePack, BUILT_IN: BUILT_IN };
  if (isNode) module.exports = Updates;
  else (window.MB = window.MB || {}).Updates = Updates;
})();
