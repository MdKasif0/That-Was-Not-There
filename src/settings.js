/**
 * ═══════════════════════════════════════════════════════════
 * Settings Manager — That Was Not There
 * ═══════════════════════════════════════════════════════════
 * 
 * Manages player preferences and accessibility:
 * - sound: Sound effects on/off
 * - ambient: Procedural ambient audio on/off
 * - reducedMotion: Accessibility toggle (disables shake, cuts particles)
 * 
 * Persisted in localStorage under 'twnt_settings'.
 */

const STORAGE_KEY = 'twnt_settings';

// Detect system preference for reduced motion by default
const systemPrefersReducedMotion = typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DEFAULT_SETTINGS = {
  sound: true,
  ambient: true,
  reducedMotion: Boolean(systemPrefersReducedMotion),
};

let currentSettings = { ...DEFAULT_SETTINGS };
const listeners = new Set();

// Load from localStorage if present
export function initSettings() {
  if (typeof window === 'undefined') return currentSettings;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      currentSettings = {
        sound: parsed.sound !== undefined ? Boolean(parsed.sound) : DEFAULT_SETTINGS.sound,
        ambient: parsed.ambient !== undefined ? Boolean(parsed.ambient) : DEFAULT_SETTINGS.ambient,
        reducedMotion: parsed.reducedMotion !== undefined ? Boolean(parsed.reducedMotion) : DEFAULT_SETTINGS.reducedMotion,
      };
    }
  } catch (_) {
    currentSettings = { ...DEFAULT_SETTINGS };
  }

  return currentSettings;
}

export function getSettings() {
  return currentSettings;
}

export function setSetting(key, value) {
  if (!(key in currentSettings)) return;
  currentSettings[key] = Boolean(value);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
  } catch (_) {}

  notifyListeners();
}

export function toggleSetting(key) {
  if (key in currentSettings) {
    setSetting(key, !currentSettings[key]);
  }
}

export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  for (const fn of listeners) {
    try {
      fn(currentSettings);
    } catch (_) {}
  }
}

// Auto-initialize on import
initSettings();
