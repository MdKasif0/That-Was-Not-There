/* ── Shared input state ────────────────────────────────── */
export const keys = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,   // true for exactly one update tick
  restart: false,
  pause: false,
  anyKey: false,
};

let _jumpPrev = false;

/* ── Keyboard ─────────────────────────────────────────── */
export function initInput(canvas, onPointerAction) {
  window.addEventListener('keydown', (e) => {
    handleKey(e.code, true);
    if (e.code === 'Space' || e.code === 'ArrowUp') e.preventDefault();
    if (e.code === 'KeyP' || e.code === 'Escape') keys.pause = true;
    keys.anyKey = true;
  });
  window.addEventListener('keyup', (e) => handleKey(e.code, false));

  if (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 960 / rect.width;
      const scaleY = 540 / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      if (onPointerAction) onPointerAction(cx, cy);
      keys.anyKey = true;
    });
  }

  setupTouch();
}

function handleKey(code, down) {
  switch (code) {
    case 'ArrowLeft':  case 'KeyA': keys.left    = down; break;
    case 'ArrowRight': case 'KeyD': keys.right   = down; break;
    case 'ArrowUp':    case 'KeyW': case 'Space': keys.jump = down; break;
    case 'KeyR':                     keys.restart = down; break;
  }
}

/* ── Touch controls ───────────────────────────────────── */
function setupTouch() {
  const btnL = document.getElementById('btn-left');
  const btnR = document.getElementById('btn-right');
  const btnJ = document.getElementById('btn-jump');
  if (!btnL) return;

  const bind = (el, key) => {
    const on  = (e) => { e.preventDefault(); keys[key] = true;  keys.anyKey = true; };
    const off = (e) => { e.preventDefault(); keys[key] = false; };
    el.addEventListener('touchstart',  on,  { passive: false });
    el.addEventListener('touchend',    off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
  };
  bind(btnL, 'left');
  bind(btnR, 'right');
  bind(btnJ, 'jump');

  // Also allow tapping the canvas area to trigger anyKey on title
  document.getElementById('game-canvas')
    ?.addEventListener('touchstart', () => { keys.anyKey = true; }, { passive: true });

  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.getElementById('touch-controls')?.classList.add('visible');
  }
}

/* ── Per-tick bookkeeping ─────────────────────────────── */
export function updateInput() {
  keys.jumpPressed = keys.jump && !_jumpPrev;
  _jumpPrev = keys.jump;
}

export function consumeAnyKey() {
  const v = keys.anyKey;
  keys.anyKey = false;
  return v;
}

export function consumeRestart() {
  const v = keys.restart;
  keys.restart = false;
  return v;
}

export function consumePause() {
  const v = keys.pause;
  keys.pause = false;
  return v;
}
