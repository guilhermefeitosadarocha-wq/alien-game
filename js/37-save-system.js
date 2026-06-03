// ═══════════════════════════════════════════════════════════
//  SAVE SYSTEM — persistência em localStorage
// ═══════════════════════════════════════════════════════════
const SaveSystem = {
  // Carrega configurações ou retorna defaults
  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return JSON.parse(JSON.stringify(SETTINGS_DEFAULTS));
      const saved = JSON.parse(raw);
      // Deep merge: garante que novos campos dos defaults existam
      return this._merge(SETTINGS_DEFAULTS, saved);
    } catch (e) {
      return JSON.parse(JSON.stringify(SETTINGS_DEFAULTS));
    }
  },

  save(data) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(data)); } catch (e) {}
  },

  _merge(defaults, saved) {
    const out = {};
    for (const k in defaults) {
      if (saved[k] === undefined) {
        out[k] = typeof defaults[k] === 'object' && defaults[k] !== null
          ? JSON.parse(JSON.stringify(defaults[k])) : defaults[k];
      } else if (typeof defaults[k] === 'object' && defaults[k] !== null) {
        out[k] = this._merge(defaults[k], saved[k]);
      } else {
        out[k] = saved[k];
      }
    }
    return out;
  },
};

