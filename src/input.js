/**
 * ═══════════════════════════════════════════════════════════
 * Centralized Input & Menu Manager — That Was Not There
 * ═══════════════════════════════════════════════════════════
 * 
 * Provides deterministic, latency-free input state for:
 * - Keyboard: A, D, ArrowLeft, ArrowRight, W, ArrowUp, Space, R, Escape, P
 * - Touch / Stylus: left, right, jump (Pointer Events with multi-touch tracking)
 * - In-game Menu Modal: Pause, Resume, Restart Room, PWA Install
 * 
 * Guarantees:
 * - Deterministic single-source of truth (inputState / keys)
 * - Multi-touch tracking via pointer capture and pointerId sets
 * - Safe release on pointercancel, lostpointercapture, and pointerleave
 * - Prevention of synthetic event duplication and unwanted browser gestures
 * - Seamless HTML/CSS in-game menu integration with game engine pause state
 */

import { getSettings, toggleSetting, onSettingsChange } from './settings.js';
import { playUI } from './audio.js';

export const inputState = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,   // active for exactly one simulation tick
  restart: false,
  restartPressed: false, // immediate trigger
  pause: false,
  pausePressed: false,
  anyKey: false,
};

// Backward-compatible alias
export const keys = inputState;

let _jumpPrev = false;
let _restartPrev = false;
let _pausePrev = false;

// Active pointers per action to support multi-touch simultaneously
const activePointers = {
  left: new Set(),
  right: new Set(),
  jump: new Set(),
};

// Active physical keys held down
const activeKeys = new Set();

let menuModalEl = null;
let menuTitleEl = null;
let menuLevelNameEl = null;

/* ── Initialization ───────────────────────────────────── */
export function initInput(canvas, onPointerAction) {
  menuModalEl = document.getElementById('menu-modal');
  menuTitleEl = document.getElementById('menu-title');
  menuLevelNameEl = document.getElementById('menu-level-name');

  // ── Keyboard Listeners ─────────────────────────────
  window.addEventListener('keydown', (e) => {
    const isModalOpen = menuModalEl && menuModalEl.classList.contains('open');

    // Prevent scrolling and default browser shortcuts for gameplay keys when playing
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      if (!isModalOpen) {
        e.preventDefault();
      }
    }

    activeKeys.add(e.code);
    applyKey(e.code, true);

    if (e.code === 'KeyR') {
      inputState.restart = true;
      inputState.restartPressed = true;
      closeMenuModal();
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (isModalOpen) {
        closeMenuModal();
      } else {
        openMenuModal();
      }
    }
    inputState.anyKey = true;
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    activeKeys.delete(e.code);
    applyKey(e.code, false);
  }, { passive: true });

  // Clear keys on window blur so inputs don't stick when unfocusing
  window.addEventListener('blur', () => {
    resetInputState();
  });

  // ── Canvas Pointer (Click / Tap for Title & UI) ────
  if (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      inputState.anyKey = true;
      if (onPointerAction) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = 960 / rect.width;
        const scaleY = 540 / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        onPointerAction(cx, cy);
      }
    }, { passive: false });
  }

  // ── Touch / Stylus Pointer Controls ────────────────
  setupPointerControls();

  // ── Menu Button & In-Game Menu Modal ───────────────
  setupMenuControls();
}

function applyKey(code, down) {
  switch (code) {
    case 'ArrowLeft':
    case 'KeyA':
      inputState.left = down || isAnyActive('ArrowLeft', 'KeyA') || activePointers.left.size > 0;
      break;

    case 'ArrowRight':
    case 'KeyD':
      inputState.right = down || isAnyActive('ArrowRight', 'KeyD') || activePointers.right.size > 0;
      break;

    case 'ArrowUp':
    case 'KeyW':
    case 'Space':
      inputState.jump = down || isAnyActive('ArrowUp', 'KeyW', 'Space') || activePointers.jump.size > 0;
      break;

    case 'KeyR':
      inputState.restart = down;
      break;
  }
}

function isAnyActive(...codes) {
  for (const c of codes) {
    if (activeKeys.has(c)) return true;
  }
  return false;
}

/* ── Touch / Pointer Controls ─────────────────────────── */
function setupPointerControls() {
  const buttons = [
    { id: 'btn-left', action: 'left' },
    { id: 'btn-right', action: 'right' },
    { id: 'btn-jump', action: 'jump' },
  ];

  for (const { id, action } of buttons) {
    const el = document.getElementById(id);
    if (!el) continue;

    const setActionDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        el.setPointerCapture(e.pointerId);
      } catch (_) {}
      activePointers[action].add(e.pointerId);
      inputState[action] = true;
      inputState.anyKey = true;
      el.classList.add('pressed');
    };

    const setActionUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      activePointers[action].delete(e.pointerId);
      if (activePointers[action].size === 0) {
        el.classList.remove('pressed');
        if (action === 'left') {
          inputState.left = isAnyActive('ArrowLeft', 'KeyA');
        } else if (action === 'right') {
          inputState.right = isAnyActive('ArrowRight', 'KeyD');
        } else if (action === 'jump') {
          inputState.jump = isAnyActive('ArrowUp', 'KeyW', 'Space');
        } else {
          inputState[action] = false;
        }
      }
    };

    el.addEventListener('pointerdown', setActionDown, { passive: false });
    el.addEventListener('pointerup', setActionUp, { passive: false });
    el.addEventListener('pointercancel', setActionUp, { passive: false });
    el.addEventListener('lostpointercapture', setActionUp, { passive: false });
    el.addEventListener('pointerleave', (e) => {
      if (!el.hasPointerCapture || !el.hasPointerCapture(e.pointerId)) {
        setActionUp(e);
      }
    }, { passive: false });

    // Prevent default context menu on touch hold
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Show touch controls if touch / pointer coarse is supported
  const isTouchDevice = ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  if (isTouchDevice) {
    document.getElementById('touch-controls')?.classList.add('visible');
  }
}

/* ── Menu & Modal Controls ────────────────────────────── */
function setupMenuControls() {
  const btnMenu = document.getElementById('btn-menu');
  const btnResume = document.getElementById('menu-btn-resume');
  const btnRestart = document.getElementById('menu-btn-restart');
  const btnInstall = document.getElementById('menu-btn-install');

  const toggleSound = document.getElementById('toggle-sound');
  const toggleAmbient = document.getElementById('toggle-ambient');
  const toggleMotion = document.getElementById('toggle-motion');

  function syncToggleUI(settings) {
    if (toggleSound) {
      toggleSound.classList.toggle('active', settings.sound);
      toggleSound.setAttribute('aria-checked', String(settings.sound));
    }
    if (toggleAmbient) {
      toggleAmbient.classList.toggle('active', settings.ambient);
      toggleAmbient.setAttribute('aria-checked', String(settings.ambient));
    }
    if (toggleMotion) {
      toggleMotion.classList.toggle('active', settings.reducedMotion);
      toggleMotion.setAttribute('aria-checked', String(settings.reducedMotion));
    }
  }

  // Initial sync & subscribe
  syncToggleUI(getSettings());
  onSettingsChange(syncToggleUI);

  if (toggleSound) {
    const row = toggleSound.closest('.setting-row') || toggleSound;
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSetting('sound');
      playUI();
    });
  }

  if (toggleAmbient) {
    const row = toggleAmbient.closest('.setting-row') || toggleAmbient;
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSetting('ambient');
      playUI();
    });
  }

  if (toggleMotion) {
    const row = toggleMotion.closest('.setting-row') || toggleMotion;
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSetting('reducedMotion');
      playUI();
    });
  }

  if (btnMenu) {
    btnMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      playUI();
      toggleMenuModal();
    });
  }

  if (btnResume) {
    btnResume.addEventListener('click', (e) => {
      e.stopPropagation();
      playUI();
      closeMenuModal();
    });
  }

  if (btnRestart) {
    btnRestart.addEventListener('click', (e) => {
      e.stopPropagation();
      playUI();
      closeMenuModal();
      inputState.restart = true;
      inputState.restartPressed = true;
    });
  }

  if (btnInstall) {
    btnInstall.addEventListener('click', (e) => {
      e.stopPropagation();
      playUI();
      if (window.__triggerPWAInstall) {
        window.__triggerPWAInstall();
      }
    });
  }

  // Keyboard navigation & accessibility inside menu modal
  if (menuModalEl) {
    menuModalEl.addEventListener('keydown', (e) => {
      if (!menuModalEl.classList.contains('open')) return;

      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeMenuModal();
        return;
      }

      // Collect focusable buttons inside the modal card
      const focusable = Array.from(menuModalEl.querySelectorAll('button:not([disabled])')).filter(
        (el) => el.offsetParent !== null && window.getComputedStyle(el).display !== 'none'
      );
      if (focusable.length === 0) return;

      const currentIndex = focusable.indexOf(document.activeElement);

      if (e.code === 'Tab') {
        e.preventDefault();
        const nextIndex = e.shiftKey
          ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
          : (currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1);
        focusable[nextIndex].focus();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex >= focusable.length - 1 || currentIndex < 0) ? 0 : currentIndex + 1;
        focusable[nextIndex].focus();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
        focusable[prevIndex].focus();
      }
    });

    // Close menu when clicking on backdrop outside the card
    menuModalEl.addEventListener('click', (e) => {
      if (e.target === menuModalEl) {
        closeMenuModal();
      }
    });
  }
}

export function resetInputState() {
  activeKeys.clear();
  inputState.left = false;
  inputState.right = false;
  inputState.jump = false;
  inputState.jumpPressed = false;
  inputState.restart = false;
  inputState.restartPressed = false;
  inputState.anyKey = false;
  _jumpPrev = false;
  _restartPrev = false;
  _pausePrev = false;
  for (const key of Object.keys(activePointers)) {
    activePointers[key].clear();
  }
  if (typeof document !== 'undefined') {
    const pressedTouch = document.querySelectorAll('.touch-btn.pressed');
    for (const b of pressedTouch) {
      b.classList.remove('pressed');
    }
  }
}

export function openMenuModal() {
  if (!menuModalEl) return;
  inputState.pause = true;
  menuModalEl.classList.add('open');
  menuModalEl.setAttribute('aria-hidden', 'false');

  // Update room indicator text
  if (typeof window !== 'undefined' && window.__gameState && window.__gameState.levelDef) {
    const s = window.__gameState;
    const lvlIdx = (s.currentLevel !== undefined) ? s.currentLevel : (s.currentLevelIndex || 0);
    const roomNum = String(lvlIdx + 1).padStart(2, '0');
    if (menuLevelNameEl) {
      menuLevelNameEl.textContent = `Room ${roomNum} / 20 — ${s.levelDef.title}`;
    }
  }

  // Keyboard navigation & accessibility: auto-focus primary resume button
  const resumeBtn = document.getElementById('menu-btn-resume');
  if (resumeBtn) {
    setTimeout(() => {
      try { resumeBtn.focus(); } catch (_) {}
    }, 40);
  }
}

export function closeMenuModal() {
  if (!menuModalEl) return;
  inputState.pause = false;
  menuModalEl.classList.remove('open');
  menuModalEl.setAttribute('aria-hidden', 'true');
  if (typeof window !== 'undefined' && window.__gameState) {
    window.__gameState.paused = false;
  }
  resetInputState();
}

export function toggleMenuModal() {
  if (!menuModalEl) return;
  if (menuModalEl.classList.contains('open')) {
    closeMenuModal();
  } else {
    openMenuModal();
  }
}

/* ── Per-tick bookkeeping ─────────────────────────────── */
/**
 * Called once per fixed simulation tick (TICK = 1000 / 60 ms).
 * Computes single-tick edge triggers deterministically.
 */
export function updateInput() {
  inputState.jumpPressed = inputState.jump && !_jumpPrev;
  _jumpPrev = inputState.jump;

  if (inputState.restart && !_restartPrev) {
    inputState.restartPressed = true;
  }
  _restartPrev = inputState.restart;

  if (inputState.pause && !_pausePrev) {
    inputState.pausePressed = true;
  }
  _pausePrev = inputState.pause;
}

export function consumeAnyKey() {
  const v = inputState.anyKey;
  inputState.anyKey = false;
  return v;
}

export function consumeRestart() {
  const v = inputState.restartPressed;
  inputState.restartPressed = false;
  return v;
}

export function consumePause() {
  const v = inputState.pausePressed;
  inputState.pausePressed = false;
  return v;
}
