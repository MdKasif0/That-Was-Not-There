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
    // Prevent scrolling and default browser shortcuts for gameplay keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    activeKeys.add(e.code);
    applyKey(e.code, true);

    if (e.code === 'KeyR') {
      inputState.restart = true;
      inputState.restartPressed = true;
      closeMenuModal();
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      inputState.pause = !inputState.pause;
      inputState.pausePressed = true;
      if (inputState.pause) {
        openMenuModal();
      } else {
        closeMenuModal();
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
    activeKeys.clear();
    inputState.left = false;
    inputState.right = false;
    inputState.jump = false;
    inputState.restart = false;
    for (const key of Object.keys(activePointers)) {
      activePointers[key].clear();
    }
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

  if (btnMenu) {
    btnMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenuModal();
    });
  }

  if (btnResume) {
    btnResume.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenuModal();
    });
  }

  if (btnRestart) {
    btnRestart.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenuModal();
      inputState.restart = true;
      inputState.restartPressed = true;
    });
  }

  if (btnInstall) {
    btnInstall.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.__triggerPWAInstall) {
        window.__triggerPWAInstall();
      }
    });
  }

  // Close menu when clicking on backdrop outside the card
  if (menuModalEl) {
    menuModalEl.addEventListener('click', (e) => {
      if (e.target === menuModalEl) {
        closeMenuModal();
      }
    });
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
    const roomNum = String(s.currentLevelIndex + 1).padStart(2, '0');
    if (menuLevelNameEl) {
      menuLevelNameEl.textContent = `Room ${roomNum} — ${s.levelDef.title}`;
    }
  }
}

export function closeMenuModal() {
  if (!menuModalEl) return;
  inputState.pause = false;
  menuModalEl.classList.remove('open');
  menuModalEl.setAttribute('aria-hidden', 'true');
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
