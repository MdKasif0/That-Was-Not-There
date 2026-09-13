import { CANVAS_W, CANVAS_H, DEATH_FREEZE, TRANSITION_MS, C } from './constants.js';
import { createGameState }                      from './state.js';
import { keys, updateInput, consumeAnyKey, consumeRestart } from './input.js';
import { updatePlayer, checkBounds }            from './physics.js';
import { resolveCollisions, checkSpikeCollision, checkDoorCollision } from './collision.js';
import { loadLevel, getLevelCount }              from './levels.js';
import { TrapRegistry }                          from './traps.js';
import { render }                                from './renderer.js';

/* ── module state ─────────────────────────────────────── */
let ctx, dpr;
let state;
let lastTime = 0;
const TICK = 1000 / 60;          // fixed time-step (ms)
let acc = 0;                     // accumulator

/* ── public API ───────────────────────────────────────── */
export function initGame(context, devicePixelRatio) {
  ctx   = context;
  dpr   = devicePixelRatio;
  state = createGameState();
}

export function startGameLoop() {
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════════════════════
   MAIN LOOP  —  fixed-step update, free render
   ═══════════════════════════════════════════════════════════ */
function loop(now) {
  let frame = now - lastTime;
  lastTime  = now;
  if (frame > 50) frame = 50;     // prevent spiral-of-death

  acc += frame;
  while (acc >= TICK) {
    updateInput();
    tick(TICK);
    acc -= TICK;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  render(ctx, state);

  requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════════════════════
   TICK  —  one fixed-step update
   ═══════════════════════════════════════════════════════════ */
function tick(dt) {
  state.time += dt;
  tickBgParticles(dt);
  tickScreenShake(dt);
  tickParticles();

  switch (state.phase) {
    case 'title':        tickTitle();       break;
    case 'playing':      tickPlaying(dt);   break;
    case 'dying':        tickDying(dt);     break;
    case 'transitioning':tickTransition(dt);break;
    case 'complete':     tickComplete();    break;
  }
}

/* ── phase: title ─────────────────────────────────────── */
function tickTitle() {
  if (consumeAnyKey()) beginLevel(0);
}

/* ── phase: playing ───────────────────────────────────── */
function tickPlaying(dt) {
  if (consumeRestart()) { resetLevel(); return; }

  if (state.levelNameTimer > 0) state.levelNameTimer -= dt;

  const p = state.player;

  updatePlayer(p, keys);
  resolveCollisions(p, state.platforms);

  if (checkBounds(p))                          { die(); return; }

  for (const trap of state.traps) {
    trap.update(p, state, dt);
  }

  if (checkSpikeCollision(p, state.spikes))    { die(); return; }
  if (checkDoorCollision(p, state.door))       { winLevel(); return; }
}

/* ── phase: dying ─────────────────────────────────────── */
function tickDying(dt) {
  if (consumeRestart()) { resetLevel(); return; }
  state.deathTimer -= dt;
  if (state.deathTimer <= 0) resetLevel();
}

/* ── phase: transitioning ─────────────────────────────── */
function tickTransition(dt) {
  const half = TRANSITION_MS / 2;
  state.transTimer -= dt;

  if (state.transDir === 'out' && state.transTimer <= 0) {
    const next = state.currentLevel + 1;
    if (next >= getLevelCount()) { state.phase = 'complete'; return; }
    beginLevel(next);
    state.phase     = 'transitioning';
    state.transDir  = 'in';
    state.transTimer = half;
  }
  if (state.transDir === 'in' && state.transTimer <= 0) {
    state.phase = 'playing';
    state.levelNameTimer = 2500;
  }
}

/* ── phase: complete ──────────────────────────────────── */
function tickComplete() {
  if (consumeRestart()) {
    state.phase        = 'title';
    state.deaths       = 0;
    state.levelAttempts = 0;
    state.currentLevel = 0;
  }
}

/* ═══════════════════════════════════════════════════════════
   LEVEL MANAGEMENT
   ═══════════════════════════════════════════════════════════ */
function beginLevel(index) {
  state.currentLevel = index;
  state.levelAttempts = 0;
  const lv = loadLevel(index);
  state.levelDef   = lv;
  state.platforms  = lv.platforms;
  state.spikes     = lv.spikes;
  state.door       = lv.door;
  state.traps      = lv.traps.map(cfg => TrapRegistry.create(cfg)).filter(Boolean);
  state.traps.forEach(trap => trap.init(state));
  resetPlayer(lv.spawn);
  state.particles  = [];
  state.shake      = { x:0, y:0, intensity:0, dur:0, maxDur:0 };
  state.phase      = 'playing';
  state.levelNameTimer = 2500;
}

function resetLevel() {
  state.levelAttempts = (state.levelAttempts || 0) + 1;
  const lv = loadLevel(state.currentLevel);
  state.levelDef   = lv;
  state.platforms  = lv.platforms;
  state.spikes     = lv.spikes;
  state.door       = lv.door;
  state.traps      = lv.traps.map(cfg => TrapRegistry.create(cfg)).filter(Boolean);
  state.traps.forEach(trap => trap.init(state));
  resetPlayer(lv.spawn);
  state.particles  = [];
  state.shake      = { x:0, y:0, intensity:0, dur:0, maxDur:0 };
  state.phase      = 'playing';
}

function resetPlayer(spawn) {
  const p = state.player;
  p.x = spawn.x;  p.y = spawn.y;
  p.vx = 0;  p.vy = 0;
  p.grounded = false;
  p.alive = true;
  p.coyoteTimer = 0;
  p.jumpBuffer  = 0;
  p.squish = 0;
  p.stretch = 0;
}

/* ═══════════════════════════════════════════════════════════
   DEATH / WIN
   ═══════════════════════════════════════════════════════════ */
function die() {
  state.player.alive = false;
  state.deaths++;
  spawnDeath(state.player.x + state.player.w / 2,
             state.player.y + state.player.h / 2);
  setShake(9, 260);
  state.deathTimer = DEATH_FREEZE;
  state.phase      = 'dying';
}

function winLevel() {
  spawnDoor();
  state.transTimer = TRANSITION_MS / 2;
  state.transDir   = 'out';
  state.phase      = 'transitioning';
}

/* ═══════════════════════════════════════════════════════════
   PARTICLES
   ═══════════════════════════════════════════════════════════ */
function spawnDeath(x, y) {
  for (let i = 0; i < 26; i++) {
    const a = (Math.PI * 2 / 26) * i + (Math.random() - 0.5) * 0.4;
    const sp = 2 + Math.random() * 4.5;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 2.5,
      life: 1,
      decay: 0.014 + Math.random() * 0.014,
      size: 2 + Math.random() * 4,
      color: C.deathCols[Math.random() * 4 | 0],
    });
  }
}

function spawnDoor() {
  const d = state.door;
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const sp = 1 + Math.random() * 3;
    state.particles.push({
      x: d.x + d.w / 2 + (Math.random() - 0.5) * d.w,
      y: d.y + Math.random() * d.h * 0.5,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1,
      decay: 0.018 + Math.random() * 0.012,
      size: 2 + Math.random() * 3,
      color: C.doorCols[Math.random() * 3 | 0],
    });
  }
}

function tickParticles() {
  const list = state.particles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= p.decay;
    if (p.life <= 0) list.splice(i, 1);
  }
}

function tickBgParticles() {
  for (const p of state.bgParticles) {
    p.y -= p.speed;
    if (p.y < -10) { p.y = CANVAS_H + 10; p.x = Math.random() * CANVAS_W; }
  }
}

/* ═══════════════════════════════════════════════════════════
   SCREEN SHAKE
   ═══════════════════════════════════════════════════════════ */
function setShake(intensity, dur) {
  state.shake = { x:0, y:0, intensity, dur, maxDur: dur };
}

function tickScreenShake(dt) {
  const s = state.shake;
  if (s.dur > 0) {
    s.dur -= dt;
    const t = Math.max(0, s.dur / s.maxDur);
    const i = s.intensity * t;
    s.x = (Math.random() - 0.5) * i * 2;
    s.y = (Math.random() - 0.5) * i * 2;
  } else {
    s.x = 0; s.y = 0;
  }
}
