import { CANVAS_W, CANVAS_H } from './constants.js';
import { initInput, resetInputState, openMenuModal } from './input.js';
import { initGame, startGameLoop, onPointerAction } from './game.js';
import { stopAmbient } from './audio.js';

/* ── Canvas setup ─────────────────────────────────────── */
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
let dpr      = window.devicePixelRatio || 1;

canvas.width  = CANVAS_W * dpr;
canvas.height = CANVAS_H * dpr;

/**
 * Responsive 16:9 Viewport Scaling & Dynamic High-DPI Adaptation
 * Supports desktop monitors, laptops, tablets, and mobile devices.
 * Uses window.visualViewport to avoid keyboard/URL-bar layout jumping.
 */
function resize() {
  // Update canvas resolution if DPR or zoom has changed
  const newDpr = window.devicePixelRatio || 1;
  if (newDpr !== dpr || canvas.width !== CANVAS_W * newDpr) {
    dpr = newDpr;
    canvas.width  = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    if (typeof window !== 'undefined' && window.__setGameDPR) {
      window.__setGameDPR(dpr);
    }
  }

  const vv = window.visualViewport;
  const cw = vv ? vv.width : window.innerWidth;
  const ch = vv ? vv.height : window.innerHeight;
  const ratio = CANVAS_W / CANVAS_H;
  let w, h;
  if (cw / ch > ratio) {
    h = ch;
    w = h * ratio;
  } else {
    w = cw;
    h = w / ratio;
  }
  canvas.style.width  = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
}

resize();
window.addEventListener('resize', resize, { passive: true });
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resize, { passive: true });
}

/* ── Browser Lifecycle, Visibility, and Tab Safety ───────── */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // When the browser tab becomes hidden, pause gameplay safely
    if (window.__gameState && window.__gameState.phase === 'playing') {
      window.__gameState.paused = true;
      openMenuModal();
    }
    stopAmbient();
    resetInputState();
  } else {
    // When the player returns, prevent accidental movement caused by stale input
    resetInputState();
  }
});

window.addEventListener('blur', () => {
  resetInputState();
});

window.addEventListener('focus', () => {
  resetInputState();
});

/* ── Boot Game & Input Systems ────────────────────────── */
initGame(ctx, dpr);
initInput(canvas, onPointerAction);
startGameLoop();

/* ── Progressive Web App (PWA) Service Worker Registration ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        // Safe update lifecycle
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version installed and ready for next load.');
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

/* ── PWA Installation Support ─────────────────────────── */
let deferredInstallPrompt = null;
const installBtn = document.getElementById('menu-btn-install');

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent browser default mini-infobar
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBtn) {
    installBtn.style.display = 'flex';
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installBtn) {
    installBtn.style.display = 'none';
  }
  console.log('[PWA] Game installed to device home screen / launcher.');
});

window.__triggerPWAInstall = async function() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[PWA] User response to install prompt:', outcome);
    deferredInstallPrompt = null;
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  } else {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      alert('To install on iOS: tap the Share button in Safari, then tap "Add to Home Screen".');
    } else {
      alert('This game is installed or already supported offline in your browser.');
    }
  }
};
