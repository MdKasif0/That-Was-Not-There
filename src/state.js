import { PLAYER_W, PLAYER_H, CANVAS_W, CANVAS_H } from './constants.js';

/* ── Player factory ───────────────────────────────────── */
export function createPlayer() {
  return {
    x: 0, y: 0,
    vx: 0, vy: 0,
    w: PLAYER_W, h: PLAYER_H,
    grounded: false,
    alive: true,
    facingRight: true,
    coyoteTimer: 0,
    jumpBuffer: 0,
    squish: 0,    // landing squash
    stretch: 0,   // jump stretch
  };
}

/* ── World / session state factory ────────────────────── */
export function createGameState() {
  return {
    phase: 'title',          // title | playing | dying | transitioning | complete
    currentLevel: 0,
    deaths: 0,

    player: createPlayer(),

    // Runtime copies — mutated by traps
    platforms:   [],
    spikes:      [],
    door:        null,
    traps:       [],
    trapStates:  [],
    levelDef:    null,

    // VFX
    particles:   [],
    bgParticles: makeBgParticles(),
    shake: { x: 0, y: 0, intensity: 0, dur: 0, maxDur: 0 },

    // Timers
    deathTimer:      0,
    transTimer:      0,
    transDir:        'out',
    levelNameTimer:  0,

    time: 0,   // cumulative ms (for animation)
  };
}

/* ── Ambient floating particles ───────────────────────── */
function makeBgParticles() {
  const p = [];
  for (let i = 0; i < 45; i++) {
    p.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      speed: 0.08 + Math.random() * 0.25,
      size: 0.8 + Math.random() * 1.4,
      opacity: 0.08 + Math.random() * 0.18,
    });
  }
  return p;
}
