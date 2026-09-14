import { CANVAS_W, CANVAS_H } from './constants.js';
import { initInput }           from './input.js';
import { initGame, startGameLoop, onPointerAction } from './game.js';

/* ── Canvas setup ─────────────────────────────────────── */
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
const dpr    = window.devicePixelRatio || 1;

canvas.width  = CANVAS_W * dpr;
canvas.height = CANVAS_H * dpr;

function resize() {
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  const ratio = CANVAS_W / CANVAS_H;
  let w, h;
  if (cw / ch > ratio) { h = ch; w = h * ratio; }
  else                  { w = cw; h = w / ratio; }
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;
}
resize();
window.addEventListener('resize', resize);

/* ── Boot ─────────────────────────────────────────────── */
initGame(ctx, dpr);
initInput(canvas, onPointerAction);
startGameLoop();

/* ── Service-worker cleanup / unregister ────────────────── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const r of regs) r.unregister();
  }).catch(() => {});
}
