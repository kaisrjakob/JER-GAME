import { STORAGE_KEYS } from './config.js';

const defaults = Object.freeze({
  music: 0.58,
  sfx: 0.78,
  muted: false,
  reducedMotion: false,
  rotate: 'auto',
  quality: 'auto'
});

function safeStorage() {
  try {
    const test = '__jeremias_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return localStorage;
  } catch {
    return null;
  }
}

export function loadHighScore() {
  const storage = safeStorage();
  if (!storage) return 0;
  const current = Number(storage.getItem(STORAGE_KEYS.highScore));
  if (Number.isFinite(current) && current >= 0) return Math.floor(current);
  const legacy = Number(storage.getItem('chimneyHighScore'));
  if (Number.isFinite(legacy) && legacy > 0) {
    storage.setItem(STORAGE_KEYS.highScore, String(Math.floor(legacy)));
    return Math.floor(legacy);
  }
  return 0;
}

export function saveHighScore(score) {
  const storage = safeStorage();
  if (storage) storage.setItem(STORAGE_KEYS.highScore, String(Math.max(0, Math.floor(score))));
}

export function loadSettings() {
  const storage = safeStorage();
  if (!storage) return { ...defaults };
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEYS.settings) || '{}');
    return {
      music: clampNumber(value.music, defaults.music),
      sfx: clampNumber(value.sfx, defaults.sfx),
      muted: Boolean(value.muted),
      reducedMotion: Boolean(value.reducedMotion) || matchMedia('(prefers-reduced-motion: reduce)').matches,
      rotate: ['auto', 'cw', 'ccw'].includes(value.rotate) ? value.rotate : defaults.rotate,
      quality: ['auto', 'low', 'medium', 'high'].includes(value.quality) ? value.quality : defaults.quality
    };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings) {
  const storage = safeStorage();
  if (storage) storage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

export function tutorialSeen() {
  return safeStorage()?.getItem(STORAGE_KEYS.tutorial) === 'true';
}

export function markTutorialSeen() {
  safeStorage()?.setItem(STORAGE_KEYS.tutorial, 'true');
}

function clampNumber(value, fallback) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
