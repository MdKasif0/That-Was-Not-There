/**
 * ═══════════════════════════════════════════════════════════
 * Centralized Input Manager
 * ═══════════════════════════════════════════════════════════
 * 
 * Provides deterministic, latency-free input state for:
 * - Keyboard: A, D, ArrowLeft, ArrowRight, W, ArrowUp, Space, R, Escape, P
 * - Touch / Stylus: left, right, jump, restart (Pointer Events)
 * 
 * Guarantees:
 * - Deterministic single-source of truth (inputState / keys)
 * - Zero DOM operations inside tick/render loops
 * - Multi-touch tracking via pointer capture and pointerId sets
 * - Safe release on pointercancel, lostpointercapture, and pointerleave
 * - Prevention of synthetic event duplication and unwanted browser scroll
 * - Instant restart consumption via R or restart button
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

// Active pointers per action to support multi-touch / stylus simultaneously
const activePointers = {
  left: new Set(),
  right: new Set(),
  jump: new Set(),
  restart: new Set(),
};

// Active physical keys held down
const activeKeys = new Set();

/* ── Initialization ───────────────────────────────────── */
export function initInput(canvas, onPointerAction) {
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
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      inputState.pause = true;
      inputState.pausePressed = true;
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
      inputState.restart = down || activePointers.restart.size > 0;
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
    { id: 'btn-restart', action: 'restart' },
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
      if (action === 'restart') {
        inputState.restartPressed = true;
      }
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
        // Retain state if keyboard key is still physically held
        if (action === 'left') {
          inputState.left = isAnyActive('ArrowLeft', 'KeyA');
        } else if (action === 'right') {
          inputState.right = isAnyActive('ArrowRight', 'KeyD');
        } else if (action === 'jump') {
          inputState.jump = isAnyActive('ArrowUp', 'KeyW', 'Space');
        } else if (action === 'restart') {
          inputState.restart = isAnyActive('KeyR');
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
      // If pointer is captured, lostpointercapture will handle release;
      // if not captured, release safely on pointerleave so input never sticks.
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
