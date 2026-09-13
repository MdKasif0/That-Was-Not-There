import { CANVAS_W, CANVAS_H, GROUND_Y, FLOOR_H, PLAYER_W, PLAYER_H } from './constants.js';

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
     ROOM 1 — "The Floor"
     The floor looks safe. It is not.
     Walking past the midpoint causes tiles to vanish
     left-to-right, dropping the player into spikes.
     Solution: sprint + timed jump to the right platform.
     ────────────────────────────────────────────────────── */
  {
    name: 'The Floor',
    subtitle: 'Walk to the door.',
    hint: '"That floor wasn\'t always missing…"',
    spawn: { x: 70, y: SPAWN_Y },
    door:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    platforms: [
      plat(0, GROUND_Y, 300, FLOOR_H),                              // left solid
      plat(300, GROUND_Y, 56, FLOOR_H, { type:'vanish', group:1 }), // tile 0
      plat(356, GROUND_Y, 56, FLOOR_H, { type:'vanish', group:1 }), // tile 1
      plat(412, GROUND_Y, 56, FLOOR_H, { type:'vanish', group:1 }), // tile 2
      plat(468, GROUND_Y, 56, FLOOR_H, { type:'vanish', group:1 }), // tile 3
      plat(524, GROUND_Y, 56, FLOOR_H, { type:'vanish', group:1 }), // tile 4
      plat(580, GROUND_Y, 380, FLOOR_H),                            // right solid
    ],
    spikes: [
      spike(305, SPIKE_Y, 270, SPIKE_H),
    ],
    traps: [
      { type: 'vanish_on_enter', triggerX: 340, group: 1, initialDelay: 180, stagger: 95 },
    ],
  },

  /* ──────────────────────────────────────────────────────
     ROOM 2 — "The Helper"
     A gap too wide to casually walk across.
     A floating platform beckons — but it drops when
     the player lands on it.
     Solution: ignore the platform; a full-speed running
     jump clears the gap.
     ────────────────────────────────────────────────────── */
  {
    name: 'The Helper',
    subtitle: 'Mind the gap.',
    hint: '"That platform seemed so helpful…"',
    spawn: { x: 70, y: SPAWN_Y },
    door:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    platforms: [
      plat(0, GROUND_Y, 300, FLOOR_H),
      plat(345, GROUND_Y - 50, 80, 16, { type:'drop', group:2 }),   // bait platform
      plat(460, GROUND_Y, 500, FLOOR_H),
    ],
    spikes: [
      spike(305, SPIKE_Y, 150, SPIKE_H),
    ],
    traps: [
      { type: 'drop_on_land', group: 2, delay: 340 },
    ],
  },

  /* ──────────────────────────────────────────────────────
     ROOM 3 — "Not Again"
     Layout looks *identical* to Room 1 — same tiles,
     same shimmer, same suspicious vibe.
     BUT: jumping in the zone causes the tiles to
     vanish INSTANTLY.  Walking across is completely safe.
     The player's learned reflex (jump!) is the trap.
     Solution: just walk.
     ────────────────────────────────────────────────────── */
  {
    name: 'Not Again',
    subtitle: 'You know what to do… right?',
    hint: '"Maybe try doing… nothing?"',
    spawn: { x: 70, y: SPAWN_Y },
    door:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    platforms: [
      plat(0, GROUND_Y, 300, FLOOR_H),
      plat(300, GROUND_Y, 56, FLOOR_H, { type:'vanish_on_jump', group:3 }),
      plat(356, GROUND_Y, 56, FLOOR_H, { type:'vanish_on_jump', group:3 }),
      plat(412, GROUND_Y, 56, FLOOR_H, { type:'vanish_on_jump', group:3 }),
      plat(468, GROUND_Y, 56, FLOOR_H, { type:'vanish_on_jump', group:3 }),
      plat(524, GROUND_Y, 56, FLOOR_H, { type:'vanish_on_jump', group:3 }),
      plat(580, GROUND_Y, 380, FLOOR_H),
    ],
    spikes: [
      spike(305, SPIKE_Y, 270, SPIKE_H),
    ],
    traps: [
      { type: 'vanish_on_jump', triggerZone: { x: 290, y: 0, w: 300, h: GROUND_Y }, group: 3 },
    ],
  },
];

/* ─── public API ──────────────────────────────────────── */
export function getLevelCount() { return LEVELS.length; }

/** Return a deep-enough copy so traps can mutate platforms. */
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
    traps:     d.traps.map(t => ({
      ...t,
      triggerZone: t.triggerZone ? { ...t.triggerZone } : null,
    })),
  };
}
