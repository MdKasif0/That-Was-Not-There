import { CANVAS_W, CANVAS_H, DEATH_FREEZE, TRANSITION_MS, C } from './constants.js';
import { createGameState }                      from './state.js';
import { keys, updateInput, consumeAnyKey, consumeRestart, consumePause, openMenuModal, closeMenuModal } from './input.js';
import { updatePlayer, updatePlayerGroundDist, checkBounds }            from './physics.js';
import { aabb, checkSpikeCollision, getCollidingSpike, checkDoorCollision } from './collision.js';
import { loadLevel, getLevelCount }              from './levels.js';
import { TrapRegistry }                          from './traps.js';
import { render }                                from './renderer.js';
import { initAudio, playJump, playLanding, playTrap, playDeath, playVictory } from './audio.js';
import { getSettings }                           from './settings.js';

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
  state.killPlayer = (cause) => die(cause);
  state.impactFreeze = 0;
  initAudio();
  if (typeof window !== 'undefined') {
    window.__gameState = state;
    window.__beginLevel = beginLevel;
    window.__setGameDPR = (val) => { dpr = val; };
  }
}

export function onPointerAction(cx, cy) {
  if (!state) return;
  if (state.phase === 'title') {
    beginLevel(0);
    return;
  }
  // If paused, clicking canvas resumes
  if (state.paused) {
    state.paused = false;
    closeMenuModal();
    return;
  }
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
  if (state.impactFreeze > 0) {
    state.impactFreeze--;
    return;
  }

  if (consumePause()) {
    state.paused = !state.paused;
    if (state.paused) {
      openMenuModal();
    } else {
      closeMenuModal();
    }
  }

  if (state.paused) {
    if (consumeRestart()) {
      state.paused = false;
      closeMenuModal();
      resetLevel();
    }
    return;
  }

  state.time += dt;
  tickBgParticles(dt);
  tickScreenShake(dt);
  tickParticles();
  tickDeathVFX(dt);

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

  updatePlayer(p, keys, state.platforms);
  updatePlayerGroundDist(p, state.platforms);

  // Jump game-feel & audio
  if (p.justJumped) {
    playJump();
    spawnJumpDust(p, state);
    p.justJumped = false;
  }

  // Landing game-feel & audio
  if (p.justLanded) {
    playLanding(p.landVelocity || 3);
    spawnLandingDust(p, state, p.landVelocity);
    if (p.landVelocity > 6.5 && !getSettings().reducedMotion) {
      setShake(1.5, 60);
    }
    p.justLanded = false;
  }

  // Record motion history for echo shadow traps
  if (state.currentRunEcho && state.currentRunEcho.length < 1200) {
    state.currentRunEcho.push({ x: p.x, y: p.y, facingRight: p.facingRight });
  }

  // Decay causal echo watermark during gameplay
  if (state.causalEcho) {
    state.causalEcho.timer -= dt;
    state.causalEcho.alpha = Math.max(0, (state.causalEcho.timer / 1600) * 0.28);
    if (state.causalEcho.timer <= 0) {
      state.causalEcho = null;
    }
  }

  if (checkBounds(p)) {
    die({ x: p.x, y: CANVAS_H - 12, w: p.w, h: 12, type: 'abyss', label: 'VOID' });
    return;
  }

  // Trap updates and subtle activation audio cues
  for (const trap of state.traps) {
    const wasTriggered = trap.triggered;
    trap.update(p, state, dt);
    if (!wasTriggered && trap.triggered) {
      playTrap(trap.type || trap.config?.type || 'trap');
    }
  }

  // Scripted events check
  if (state.scriptedEvents) {
    for (const ev of state.scriptedEvents) {
      if (!ev.triggered && ev.trigger && ev.trigger(state, p)) {
        ev.triggered = true;
        if (ev.action) ev.action(state, p);
      }
    }
  }

  // Secret collectible check
  if (state.secret && !state.secret.collected) {
    if (aabb(p, state.secret)) {
      state.secret.collected = true;
      if (!state.secretsCollected.includes(state.levelDef.id)) {
        state.secretsCollected.push(state.levelDef.id);
      }
      for (let i = 0; i < 16; i++) {
        state.particles.push({
          x: state.secret.x + 9,
          y: state.secret.y + 9,
          vx: (Math.random() - 0.5) * 4.5,
          vy: (Math.random() - 0.5) * 4.5,
          life: 1,
          decay: 0.02,
          size: 3,
          color: C.secretStar,
        });
      }
    }
  }

  const hitSpike = getCollidingSpike(p, state.spikes);
  if (hitSpike) {
    die({ x: hitSpike.x, y: hitSpike.y, w: hitSpike.w, h: hitSpike.h, type: 'spike', label: 'HAZARD' });
    return;
  }

  // Completion condition check
  const completed = (state.levelDef && typeof state.levelDef.completionCondition === 'function')
    ? state.levelDef.completionCondition(state, p)
    : checkDoorCollision(p, state.door);

  if (completed) { winLevel(); return; }
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
  state.causalEcho = null;
  state.lastRunEcho = [];
  state.currentRunEcho = [];
  const lv = loadLevel(index);
  state.levelDef   = lv;
  state.platforms  = lv.platforms;
  state.spikes     = lv.spikes || lv.hazards;
  state.door       = lv.exit || lv.door;
  state.camera     = lv.camera || { panX: 0, panY: 0, zoom: 1 };
  state.scriptedEvents = lv.scriptedEvents || [];
  state.secret     = lv.secret || null;
  state.traps      = lv.traps.map(cfg => TrapRegistry.create(cfg)).filter(Boolean);
  state.traps.forEach(trap => trap.init(state));
  resetPlayer(lv.spawn);
  state.particles   = [];
  state.deathRing   = null;
  state.deathShards = [];
  state.paused      = false;
  closeMenuModal();
  state.shake       = { x:0, y:0, intensity:0, dur:0, maxDur:0 };
  state.phase       = 'playing';
  state.levelNameTimer = 2200;
}

function resetLevel() {
  state.levelAttempts = (state.levelAttempts || 0) + 1;

  // Preserve previous run echo for EchoTrailTrap
  if (state.currentRunEcho && state.currentRunEcho.length > 0) {
    state.lastRunEcho = [...state.currentRunEcho];
  }
  state.currentRunEcho = [];

  // Soften causal echo on retry so it serves as a subtle watermark
  if (state.causalEcho) {
    state.causalEcho.alpha = Math.min(state.causalEcho.alpha, 0.28);
    state.causalEcho.timer = 1600;
  }

  const lv = loadLevel(state.currentLevel);
  state.levelDef   = lv;
  state.platforms  = lv.platforms;
  state.spikes     = lv.spikes || lv.hazards;
  state.door       = lv.exit || lv.door;
  state.camera     = lv.camera || { panX: 0, panY: 0, zoom: 1 };
  state.scriptedEvents = lv.scriptedEvents || [];
  state.secret     = lv.secret || null;
  state.traps      = lv.traps.map(cfg => TrapRegistry.create(cfg)).filter(Boolean);
  state.traps.forEach(trap => trap.init(state));
  resetPlayer(lv.spawn);
  state.particles   = [];
  state.deathRing   = null;
  state.deathShards = [];
  state.paused      = false;
  closeMenuModal();
  state.shake       = { x:0, y:0, intensity:0, dur:0, maxDur:0 };
  state.phase       = 'playing';
}

function resetPlayer(spawn) {
  const p = state.player;
  p.x = spawn.x;  p.y = spawn.y;
  p.vx = 0;  p.vy = 0;
  p.grounded = false;
  p.alive = true;
  p.controlsInverted = false;
  p.coyoteTimer = 0;
  p.jumpBuffer  = 0;
  p.squish = 0;
  p.stretch = 0;
  p.walkCycle = 0;
  p.tilt = 0;
  p.eyeOffsetX = 0;
  p.eyeOffsetY = 0;
  p.groundDist = 0;
}

/* ═══════════════════════════════════════════════════════════
   DEATH / WIN
   ═══════════════════════════════════════════════════════════ */
function die(causeInfo) {
  if (!state.player.alive) return;
  state.player.alive = false;
  state.deaths++;
  playDeath();

  const cx = state.player.x + state.player.w / 2;
  const cy = state.player.y + state.player.h / 2;

  // Causal Echo for subtle post-death realization
  state.causalEcho = {
    x: causeInfo?.x ?? cx - 15,
    y: causeInfo?.y ?? cy - 15,
    w: causeInfo?.w ?? 30,
    h: causeInfo?.h ?? 30,
    type: causeInfo?.type ?? 'hazard',
    label: causeInfo?.label ?? '',
    fromX: cx,
    fromY: cy,
    alpha: 0.95,
    timer: 1600,
  };

  // Subtle impact shockwave ring
  state.deathRing = { x: cx, y: cy, radius: 4, alpha: 0.95 };

  // Geometric polygon shatter
  spawnDeathShards(cx, cy);

  // Screen shake & impact freeze frame
  if (!getSettings().reducedMotion) {
    setShake(5.5, 110);
    state.impactFreeze = 2;
  } else {
    state.shake = { x: 0, y: 0, intensity: 0, dur: 0, maxDur: 0 };
    state.impactFreeze = 0;
  }

  state.deathTimer = DEATH_FREEZE;
  state.phase      = 'dying';
}

function spawnDeathShards(x, y) {
  state.deathShards = [];
  const shardCount = 10;
  for (let i = 0; i < shardCount; i++) {
    const angle = (Math.PI * 2 / shardCount) * i + (Math.random() - 0.5) * 0.35;
    const sp = 2.4 + Math.random() * 3.8;
    state.deathShards.push({
      x, y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp - 1.2,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.35,
      size: 3.5 + Math.random() * 3.5,
      life: 1.0,
      color: C.deathCols[i % C.deathCols.length],
    });
  }
}

function tickDeathVFX(dt) {
  if (state.deathRing) {
    state.deathRing.radius += dt * 0.45;
    state.deathRing.alpha -= dt * 0.012;
    if (state.deathRing.alpha <= 0) state.deathRing = null;
  }

  for (let i = state.deathShards.length - 1; i >= 0; i--) {
    const sh = state.deathShards[i];
    sh.x += sh.vx;
    sh.y += sh.vy;
    sh.vy += 0.12; // subtle gravity
    sh.rot += sh.vrot;
    sh.life -= dt * 0.011;
    if (sh.life <= 0) state.deathShards.splice(i, 1);
  }
}

function winLevel() {
  playVictory();
  spawnDoor();
  state.transTimer = getSettings().reducedMotion ? 60 : TRANSITION_MS / 2;
  state.transDir   = 'out';
  state.phase      = 'transitioning';
}

/* ═══════════════════════════════════════════════════════════
   PARTICLES & DUST
   ═══════════════════════════════════════════════════════════ */
function spawnJumpDust(p, s) {
  if (getSettings().reducedMotion) return;
  const feetY = p.y + p.h;
  const cx = p.x + p.w / 2;
  for (let i = 0; i < 4; i++) {
    const dir = (i % 2 === 0 ? -1 : 1);
    s.particles.push({
      x: cx + dir * (Math.random() * 6),
      y: feetY - 2,
      vx: dir * (0.6 + Math.random() * 1.4),
      vy: -(0.3 + Math.random() * 0.7),
      life: 1,
      decay: 0.055 + Math.random() * 0.035,
      size: 1.6 + Math.random() * 1.8,
      color: 'rgba(210, 230, 255, 0.45)',
    });
  }
}

function spawnLandingDust(p, s, speed = 4) {
  if (getSettings().reducedMotion) return;
  const feetY = p.y + p.h;
  const count = Math.min(6, Math.max(3, Math.floor(speed * 0.7)));
  for (let i = 0; i < count; i++) {
    const dir = (i % 2 === 0 ? -1 : 1);
    s.particles.push({
      x: p.x + p.w / 2 + dir * (2 + Math.random() * 8),
      y: feetY - 2,
      vx: dir * (1.1 + Math.random() * 2.0),
      vy: -(0.4 + Math.random() * 0.9),
      life: 1,
      decay: 0.05 + Math.random() * 0.03,
      size: 1.8 + Math.random() * 2.2,
      color: 'rgba(190, 220, 255, 0.42)',
    });
  }
}

function spawnDeath(x, y) {
  if (getSettings().reducedMotion) return;
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 / 12) * i + (Math.random() - 0.5) * 0.4;
    const sp = 2 + Math.random() * 3.5;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 1.8,
      life: 1,
      decay: 0.024 + Math.random() * 0.016,
      size: 2 + Math.random() * 3,
      color: C.deathCols[Math.random() * C.deathCols.length | 0],
    });
  }
}

function spawnDoor() {
  const d = state.door;
  const count = getSettings().reducedMotion ? 4 : 18;
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const sp = 1 + Math.random() * 3;
    state.particles.push({
      x: d.x + d.w / 2 + (Math.random() - 0.5) * d.w,
      y: d.y + Math.random() * d.h * 0.5,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1,
      decay: 0.022 + Math.random() * 0.012,
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
  if (getSettings().reducedMotion) return;
  for (const p of state.bgParticles) {
    p.y -= p.speed;
    if (p.y < -10) { p.y = CANVAS_H + 10; p.x = Math.random() * CANVAS_W; }
  }
}

/* ═══════════════════════════════════════════════════════════
   SCREEN SHAKE
   ═══════════════════════════════════════════════════════════ */
function setShake(intensity, dur) {
  if (getSettings().reducedMotion) {
    state.shake = { x:0, y:0, intensity:0, dur:0, maxDur:0 };
    return;
  }
  state.shake = { x:0, y:0, intensity, dur, maxDur: dur };
}

function tickScreenShake(dt) {
  if (getSettings().reducedMotion) {
    state.shake.x = 0;
    state.shake.y = 0;
    return;
  }
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
