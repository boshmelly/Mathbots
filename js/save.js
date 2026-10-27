/* Versioned save data with validation, a last-known-good backup and safe
 * recovery. Storage is pluggable:
 *   - NW.js desktop app: JSON files under nw.App.dataPath/MathBots/
 *     (a per-Windows-user folder, never the install folder)
 *   - Browser development: localStorage (DEVELOPMENT FALLBACK ONLY)
 *   - Tests: in-memory */
(function () {
  'use strict';
  var isNode = typeof module === 'object' && module.exports && typeof window === 'undefined';
  var Config = isNode ? require('./config.js') : window.MB.Config;
  var Learning = isNode ? require('./learning.js') : window.MB.Learning;

  var PRIMARY = 'progress.json';
  var BACKUP = 'progress.backup.json';

  function defaultSave() {
    var missions = {};
    Config.MISSIONS.forEach(function (m, i) {
      missions[m.id] = { unlocked: i === 0, completed: false, completions: 0, bestCoins: 0 };
    });
    return {
      version: Config.SAVE_SCHEMA_VERSION,
      savedAt: null,
      tutorialSeen: false,
      player: { coins: 0, lifetimeCoins: 0, footballs: 0, badges: [] },
      missions: missions,
      activeMission: null,
      learning: Learning.createLearning(),
      settings: { muted: false, reducedMotion: false, highContrast: false, touchButtons: true },
      updates: { lastCheck: null, status: 'Using built-in challenges' },
      ledger: []
    };
  }

  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function num(v, def, min, max) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return def;
    if (min !== undefined && v < min) return min;
    if (max !== undefined && v > max) return max;
    return v;
  }
  function bool(v, def) { return typeof v === 'boolean' ? v : def; }
  function strArr(v, cap) {
    if (!Array.isArray(v)) return [];
    var out = v.filter(function (x) { return typeof x === 'string' && x.length < 120; });
    return cap ? out.slice(-cap) : out;
  }
  var FACT_RE = /^(1[0-2]|[1-9])x(1[0-2]|[1-9])$/;

  // Returns { ok, data, errors }. `ok` is false only when the file is unusable
  // (not an object or wrong version); small field problems are repaired.
  function validateSave(raw) {
    var errors = [];
    if (!isObj(raw)) return { ok: false, data: null, errors: ['not an object'] };
    if (raw.version !== Config.SAVE_SCHEMA_VERSION) return { ok: false, data: null, errors: ['unknown version ' + raw.version] };
    var d = defaultSave();

    d.savedAt = typeof raw.savedAt === 'string' ? raw.savedAt : null;
    d.tutorialSeen = bool(raw.tutorialSeen, false);

    if (isObj(raw.player)) {
      d.player.coins = Math.floor(num(raw.player.coins, 0, 0, 1e7));
      d.player.lifetimeCoins = Math.floor(num(raw.player.lifetimeCoins, d.player.coins, 0, 1e8));
      d.player.footballs = Math.floor(num(raw.player.footballs, 0, 0, 1e7));
      d.player.badges = strArr(raw.player.badges, 50);
    } else errors.push('player repaired');

    if (isObj(raw.missions)) {
      Object.keys(d.missions).forEach(function (id) {
        var m = raw.missions[id];
        if (!isObj(m)) return;
        d.missions[id].unlocked = bool(m.unlocked, d.missions[id].unlocked);
        d.missions[id].completed = bool(m.completed, false);
        d.missions[id].completions = Math.floor(num(m.completions, 0, 0, 1e6));
        d.missions[id].bestCoins = Math.floor(num(m.bestCoins, 0, 0, 1e6));
      });
    } else errors.push('missions repaired');
    // A completed mission always unlocks the next one.
    Config.MISSIONS.forEach(function (m, i) {
      var next = Config.MISSIONS[i + 1];
      if (next && d.missions[m.id].completed) d.missions[next.id].unlocked = true;
    });
    d.missions[Config.MISSIONS[0].id].unlocked = true;

    var am = raw.activeMission;
    if (isObj(am) && typeof am.id === 'string' && d.missions[am.id] && d.missions[am.id].unlocked) {
      d.activeMission = {
        id: am.id,
        runId: typeof am.runId === 'string' ? am.runId : 'r' + Date.now().toString(36),
        checkpoint: Math.floor(num(am.checkpoint, 0, 0, 50)),
        gatesOpened: strArr(am.gatesOpened, 20),
        collected: Array.isArray(am.collected) ? am.collected.filter(function (n) { return Number.isInteger(n) && n >= 0 && n < 1000; }).slice(0, 500) : [],
        runCoins: Math.floor(num(am.runCoins, 0, 0, 1e6))
      };
    }

    if (isObj(raw.learning)) {
      var L = raw.learning;
      if (isObj(L.facts)) {
        Object.keys(L.facts).forEach(function (k) {
          var f = L.facts[k];
          if (!FACT_RE.test(k) || !isObj(f)) return;
          var att = Math.floor(num(f.attempts, 0, 0, 1e6));
          d.learning.facts[k] = {
            attempts: att,
            correct: Math.min(att, Math.floor(num(f.correct, 0, 0, 1e6))),
            streak: Math.floor(num(f.streak, 0, 0, 1e6)),
            mastery: num(f.mastery, 0, 0, 1),
            last: Math.floor(num(f.last, -1, -1, 1e9)),
            miss: bool(f.miss, false)
          };
        });
      }
      d.learning.history = strArr(L.history, Learning.HISTORY_CAP).filter(function (k) { return FACT_RE.test(k); });
      d.learning.count = Math.floor(num(L.count, 0, 0, 1e9));
      d.learning.streak = Math.floor(num(L.streak, 0, 0, 1e6));
      d.learning.bestStreak = Math.floor(num(L.bestStreak, 0, 0, 1e6));
    } else errors.push('learning repaired');

    if (isObj(raw.settings)) {
      Object.keys(d.settings).forEach(function (k) { d.settings[k] = bool(raw.settings[k], d.settings[k]); });
    }
    if (isObj(raw.updates)) {
      d.updates.lastCheck = typeof raw.updates.lastCheck === 'string' ? raw.updates.lastCheck : null;
    }
    d.ledger = strArr(raw.ledger, 400);
    return { ok: true, data: d, errors: errors };
  }

  function parse(text) {
    if (typeof text !== 'string' || !text.length) return null;
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  function createSaveManager(storage) {
    var lastWritten = null;

    function load() {
      var primaryText = safeRead(PRIMARY);
      var v = validateSave(parse(primaryText));
      if (v.ok) return { data: v.data, source: 'primary', recovered: false };
      var backupText = safeRead(BACKUP);
      var vb = validateSave(parse(backupText));
      if (vb.ok) return { data: vb.data, source: 'backup', recovered: primaryText !== null };
      return { data: defaultSave(), source: 'new', recovered: primaryText !== null || backupText !== null };
    }

    function safeRead(name) {
      try { return storage.read(name); } catch (e) { return null; }
    }

    // Write the current save; the previous good file becomes the backup.
    function save(data) {
      data.savedAt = new Date().toISOString();
      var json = JSON.stringify(data);
      if (json === lastWritten) return { ok: true, skipped: true };
      try {
        var prev = safeRead(PRIMARY);
        if (prev && prev !== json && validateSave(parse(prev)).ok) storage.write(BACKUP, prev);
        storage.write(PRIMARY, json);
        lastWritten = json;
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String(e && e.message || e) };
      }
    }

    function restoreBackup() {
      var vb = validateSave(parse(safeRead(BACKUP)));
      if (!vb.ok) return null;
      storage.write(PRIMARY, JSON.stringify(vb.data));
      lastWritten = null;
      return vb.data;
    }

    function exportText(data) { return JSON.stringify(data, null, 2); }

    function importText(text) {
      var v = validateSave(parse(text));
      return v.ok ? v.data : null;
    }

    return {
      load: load, save: save, restoreBackup: restoreBackup,
      exportText: exportText, importText: importText, storage: storage
    };
  }

  // ---- Storage adapters ----
  function memoryStorage() {
    var files = {};
    return {
      kind: 'memory',
      read: function (n) { return Object.prototype.hasOwnProperty.call(files, n) ? files[n] : null; },
      write: function (n, s) { files[n] = String(s); },
      files: files
    };
  }

  function localStorageStorage(ls) {
    return {
      kind: 'browser (development fallback: localStorage)',
      location: 'this browser profile\'s localStorage',
      read: function (n) { return ls.getItem('mathbots:' + n); },
      write: function (n, s) { ls.setItem('mathbots:' + n, s); }
    };
  }

  // NW.js: per-Windows-user folder, e.g.
  // C:\Users\<Noah>\AppData\Local\mathbots-kick-off-quest\User Data\Default\MathBots\
  function nwFileStorage(nwApp, fs, path) {
    var dir = path.join(nwApp.dataPath, 'MathBots');
    fs.mkdirSync(dir, { recursive: true });
    return {
      kind: 'desktop file',
      location: dir,
      dir: dir,
      read: function (n) {
        var p = path.join(dir, n);
        return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
      },
      write: function (n, s) {
        var p = path.join(dir, n);
        var tmp = p + '.tmp';
        fs.writeFileSync(tmp, s, 'utf8');
        fs.renameSync(tmp, p); // replace in one step so a crash can't leave half a file
      },
      writeExtra: function (relName, s) {
        var p = path.join(dir, relName);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, s, 'utf8');
        return p;
      }
    };
  }

  // Choose the best storage for where the game is running.
  function detectStorage() {
    try {
      if (typeof nw !== 'undefined' && nw.App && nw.App.dataPath && typeof require === 'function') {
        return nwFileStorage(nw.App, require('fs'), require('path'));
      }
    } catch (e) { /* fall through to localStorage */ }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('mathbots:probe', '1');
        window.localStorage.removeItem('mathbots:probe');
        return localStorageStorage(window.localStorage);
      }
    } catch (e) { /* fall through */ }
    var m = memoryStorage();
    m.kind = 'temporary memory (progress will not be kept)';
    return m;
  }

  var Save = {
    PRIMARY: PRIMARY, BACKUP: BACKUP,
    defaultSave: defaultSave, validateSave: validateSave, createSaveManager: createSaveManager,
    memoryStorage: memoryStorage, localStorageStorage: localStorageStorage,
    nwFileStorage: nwFileStorage, detectStorage: detectStorage
  };

  if (isNode) module.exports = Save;
  else (window.MB = window.MB || {}).Save = Save;
})();
