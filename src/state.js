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
    squish: 0,       // landing squash
    stretch: 0,      // jump stretch
    walkCycle: 0,    // continuous stride phase
    tilt: 0,         // smooth body lean angle (-0.2 to 0.2 rad)
    blinkTimer: 180, // frames until next eye blink
    blinkState: 0,   // 0 = open, 1 = shut
    eyeOffsetX: 0,   // gaze offset
    eyeOffsetY: 0,
    groundDist: 0,   // vertical distance to solid platform beneath
  };
}

/* ── World / session state factory ────────────────────── */
export function createGameState() {
  return {
    phase: 'title',          // title | playing | dying | transitioning | complete
    paused: false,
    pauseBtn: { x: CANVAS_W - 44, y: 12, w: 30, h: 28 },
    currentLevel: 0,
    levelAttempts: 0,
    deaths: 0,

    player: createPlayer(),

    // Runtime copies — mutated by traps
    platforms:   [],
    spikes:      [],
    door:        null,
    traps:       [],
    trapStates:  [],
    // Level data & scripted hooks
    levelDef:        null,
    scriptedEvents:  [],
    secret:          null,
    secretsCollected:[],

    // Camera settings
    camera: { panX: 0, panY: 0, zoom: 1 },

    // VFX & Depth
    particles:   [],
    bgParticles: makeBgParticles(),
    monoliths:   makeMonoliths(),
    shake: { x: 0, y: 0, intensity: 0, dur: 0, maxDur: 0 },
    deathRing:   null,       // { x, y, radius, maxRadius, alpha }
    deathShards: [],         // polygon shards upon death shatter

    // Timers
    deathTimer:      0,
    transTimer:      0,
    transDir:        'out',
    levelNameTimer:  0,

    time: 0,   // cumulative ms (for animation)
  };
}

/* ── Distant geometric monoliths for background depth ─── */
function makeMonoliths() {
  const m = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    const w = 45 + ((i * 37) % 55);
    const h = 130 + ((i * 53) % 190);
    const x = (CANVAS_W / count) * i + ((i * 23) % 30) - 20;
    m.push({
      x,
      y: CANVAS_H - h + 20,
      w,
      h,
      opacity: 0.18 + ((i * 17) % 20) * 0.01,
      peakCut: (i % 2 === 0) ? 14 : 0,
    });
  }
  return m;
}

/* ── Ambient floating dust motes ──────────────────────── */
function makeBgParticles() {
  const p = [];
  for (let i = 0; i < 48; i++) {
    p.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      speed: 0.07 + Math.random() * 0.22,
      size: 1.0 + Math.random() * 1.5,
      opacity: 0.08 + Math.random() * 0.16,
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 0.001 + Math.random() * 0.0015,
    });
  }
  return p;
}
