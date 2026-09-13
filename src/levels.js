import { CANVAS_W, CANVAS_H, GROUND_Y, FLOOR_H, PLAYER_H } from './constants.js';

/* ─── helpers ─────────────────────────────────────────── */
const SPAWN_Y = GROUND_Y - PLAYER_H;
const DOOR_H  = 56;
const DOOR_W  = 36;
const DOOR_Y  = GROUND_Y - DOOR_H;
const SPIKE_H = 24;
const SPIKE_Y = CANVAS_H - SPIKE_H;

function plat(x, y, w, h, extra = {}) {
  return { x, y, w, h, visible: true, solid: true, type: 'solid', group: null,
           opacity: 1, shakeX: 0, warning: false, ...extra };
}

function spike(x, y, w, h, dir = 'up') {
  return { x, y, w, h, dir, active: true };
}

/* ─── level definitions ───────────────────────────────── */
const LEVELS = [

  /* ──────────────────────────────────────────────────────
     ROOM 1 — "The Groundwork"
     Demonstrates Delayed Platforms, Reactive Wall, and Decoy Object.
     The golden artifact in the upper alcove tempts greed,
     while the bridge shivers before collapsing.
     ────────────────────────────────────────────────────── */
  {
    name: 'The Groundwork',
    subtitle: 'Not everything solid stays solid.',
    hint: '"Beware the shiver beneath your feet."',
    spawn: { x: 60, y: SPAWN_Y },
    door:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    platforms: [
      plat(0, GROUND_Y, 260, FLOOR_H),                                // starting ledge
      plat(580, GROUND_Y, 380, FLOOR_H),                              // exit ledge
      plat(160, GROUND_Y - 100, 70, 16),                              // alcove holding decoy
    ],
    spikes: [
      spike(265, SPIKE_Y, 310, SPIKE_H),                              // central spike pit
    ],
    traps: [
      // Decoy object in upper left
      { type: 'decoyObject', x: 185, y: GROUND_Y - 145, width: 24, height: 24 },
      // Delayed stepping stone 1
      { type: 'delayedPlatform', x: 280, y: GROUND_Y - 20, width: 75, height: 20, delay: 650 },
      // Delayed stepping stone 2
      { type: 'delayedPlatform', x: 385, y: GROUND_Y - 45, width: 75, height: 20, delay: 550 },
      // Delayed stepping stone 3
      { type: 'delayedPlatform', x: 490, y: GROUND_Y - 30, width: 75, height: 20, delay: 600 },
      // Reactive wall hanging from ceiling
      { type: 'reactiveWall', x: 670, y: GROUND_Y - 150, width: 24, height: 90, targetY: GROUND_Y - 80, speed: 2.5, triggerDistance: 120 },
    ],
  },

  /* ──────────────────────────────────────────────────────
     ROOM 2 — "Momentum & Return"
     Demonstrates Momentum Trap, Return Trap, and Timing Switch.
     A frictionless runway requires precise leap timing.
     Backtracking triggers return spikes.
     The timing switch lowers a temporary bridge.
     ────────────────────────────────────────────────────── */
  {
    name: 'Momentum & Return',
    subtitle: 'Commit to your velocity.',
    hint: '"Once you move forward, never look back."',
    spawn: { x: 60, y: SPAWN_Y },
    door:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    platforms: [
      plat(0, GROUND_Y, 200, FLOOR_H),                                // start platform
      plat(480, GROUND_Y, 140, FLOOR_H),                              // mid island with switch
      plat(760, GROUND_Y, 200, FLOOR_H),                              // goal platform
      // Switch-activated bridge across final gap (group 10)
      plat(620, GROUND_Y, 140, FLOOR_H, { group: 10, visible: false, solid: false }),
    ],
    spikes: [
      spike(205, SPIKE_Y, 270, SPIKE_H),                              // gap 1 spikes
      spike(625, SPIKE_Y, 130, SPIKE_H),                              // gap 2 spikes
    ],
    traps: [
      // Frictionless ice runway across gap 1
      { type: 'momentumTrap', x: 230, y: GROUND_Y - 15, width: 220, height: 18, mode: 'frictionless' },
      // Return trap on the mid island: walking forward is fine, backtracking triggers spikes
      { type: 'returnTrap', x: 485, y: GROUND_Y, width: 130, height: 16, forwardBoundaryX: 560 },
      // Timing switch that deploys bridge across final gap for 3.5s
      { type: 'timingSwitch', x: 535, y: GROUND_Y - 32, width: 24, height: 32, duration: 3500, targetGroupId: 10 },
    ],
  },

  /* ──────────────────────────────────────────────────────
     ROOM 3 — "Trust Issues"
     Demonstrates Memory Trap, Fake Safe Zone, and Confidence Trap.
     The Safe Haven tempts hesitation.
     The runes shift polarity across attempts.
     A covered spike pit punishes blind confidence.
     ────────────────────────────────────────────────────── */
  {
    name: 'Trust Issues',
    subtitle: 'Safety is a psychological illusion.',
    hint: '"Read the runes, do not linger in comfort."',
    spawn: { x: 60, y: SPAWN_Y },
    door:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    platforms: [
      plat(0, GROUND_Y, 180, FLOOR_H),                                // start
      plat(490, GROUND_Y, 120, FLOOR_H),                              // safe island
      plat(780, GROUND_Y, 180, FLOOR_H),                              // end
    ],
    spikes: [
      spike(185, SPIKE_Y, 300, SPIKE_H),
      spike(615, SPIKE_Y, 160, SPIKE_H),
    ],
    traps: [
      // Memory trap: Twin platforms with illuminated Rune I vs Rune II
      { type: 'memoryTrap', x: 220, y: GROUND_Y - 30, width: 230, height: 18, collapseDelay: 220 },
      // Fake Safe Zone on the middle island
      { type: 'fakeSafeZone', x: 500, y: GROUND_Y - 65, width: 100, height: 65, chargeTime: 850 },
      // Confidence trap: dormant plank over final spike gap
      { type: 'confidenceTrap', x: 635, y: GROUND_Y - 15, width: 120, height: 16, dormancyDelay: 320 },
    ],
  },

  /* ──────────────────────────────────────────────────────
     ROOM 4 — "The Grand Illusion"
     Demonstrates False Exit & Combined Master Gauntlet.
     Approaching the obvious portal triggers an emergency lockdown
     and reveals the true exit on the upper observation deck.
     ────────────────────────────────────────────────────── */
  {
    name: 'The Grand Illusion',
    subtitle: 'Believe nothing you see.',
    hint: '"The door you seek is not where you think."',
    spawn: { x: 60, y: SPAWN_Y },
    door:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },              // real door initially moved offscreen by falseExit
    platforms: [
      plat(0, GROUND_Y, 200, FLOOR_H),                                // starting ground
      plat(280, GROUND_Y - 60, 110, 18),                              // mid platform 1
      plat(460, GROUND_Y - 120, 110, 18),                             // mid platform 2
      plat(640, GROUND_Y - 180, 110, 18),                             // high platform 3
      plat(820, GROUND_Y - 240, 140, 20),                             // high observation deck (real exit destination)
      plat(600, GROUND_Y, 360, FLOOR_H),                              // lower ground holding false door
    ],
    spikes: [
      spike(205, SPIKE_Y, 390, SPIKE_H),
    ],
    traps: [
      // False exit door placed in the lower right
      {
        type: 'falseExit',
        x: 880,
        y: DOOR_Y,
        width: DOOR_W,
        height: DOOR_H,
        triggerRadius: 110,
        realExitX: 880,
        realExitY: GROUND_Y - 240 - DOOR_H,
      },
      // Delayed platform on path 2
      { type: 'delayedPlatform', x: 460, y: GROUND_Y - 120, width: 110, height: 18, delay: 700 },
      // Reactive wall defending the observation deck
      { type: 'reactiveWall', x: 780, y: GROUND_Y - 330, width: 22, height: 90, targetY: GROUND_Y - 270, speed: 2, triggerDistance: 130 },
    ],
  },
];

/* ─── public API ──────────────────────────────────────── */
export function getLevelCount() { return LEVELS.length; }

/** Return a clean deep copy for the game state */
export function loadLevel(index) {
  const d = LEVELS[index];
  return {
    name:     d.name,
    subtitle: d.subtitle,
    hint:     d.hint,
    spawn:    { ...d.spawn },
    door:     { ...d.door },
    platforms: d.platforms.map(p => ({ ...p })),
    spikes:    d.spikes.map(s => ({ ...s })),
    traps:     d.traps.map(t => ({ ...t })),
  };
}
