import { CANVAS_W, CANVAS_H, GROUND_Y, FLOOR_H, PLAYER_H } from './constants.js';

/* ─── Construction Helpers ────────────────────────────── */
const SPAWN_Y = GROUND_Y - PLAYER_H;
const DOOR_H  = 56;
const DOOR_W  = 36;
const DOOR_Y  = GROUND_Y - DOOR_H;
const SPIKE_H = 24;
const SPIKE_Y = CANVAS_H - SPIKE_H;

function plat(x, y, w, h, extra = {}) {
  return {
    x, y, w, h,
    visible: true,
    solid: true,
    type: 'solid',
    group: null,
    opacity: 1,
    shakeX: 0,
    warning: false,
    ...extra,
  };
}

function spike(x, y, w, h, dir = 'up') {
  return { x, y, w, h, dir, active: true };
}

/* ═══════════════════════════════════════════════════════════
   15 HANDCRAFTED DATA-DRIVEN LEVELS
   ═══════════════════════════════════════════════════════════ */
export const LEVELS = [

  /* ──────────────────────────────────────────────────────
     LEVEL 1: "The Hesitant Step"
     Arc 1: Objects behave unexpectedly.
     The 3rd step of an ascending staircase shivers and drops
     after the player lands on it.
     Solution: Leap directly from step 2 to step 4 or tap lightly.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_01',
    title: 'The Hesitant Step',
    subtitle: 'Not every step is ready for you.',
    difficulty: 1,
    spawn: { x: 70, y: SPAWN_Y },
    exit:  { x: 880, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 220, FLOOR_H),                                // start
      plat(240, GROUND_Y - 30, 80, 18),                               // step 1
      plat(350, GROUND_Y - 60, 80, 18),                               // step 2
      plat(570, GROUND_Y - 60, 80, 18),                               // step 4
      plat(680, GROUND_Y, 280, FLOOR_H),                              // exit ledge
      plat(130, GROUND_Y - 120, 60, 16),                              // secret alcove
    ],
    hazards: [
      spike(225, SPIKE_Y, 450, SPIKE_H),
    ],
    traps: [
      // Step 3 is a delayed platform that collapses after 550ms
      { type: 'delayedPlatform', x: 460, y: GROUND_Y - 60, width: 80, height: 18, delay: 550 },
    ],
    secret: { x: 150, y: GROUND_Y - 150, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 2: "The Retiring Portal"
     Arc 1: Objects behave unexpectedly.
     Approaching the obvious upper portal closes it with a barrier,
     revealing the true lower ventilation passage.
     Solution: Trigger the barrier, then drop into the lower duct.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_02',
    title: 'The Retiring Portal',
    subtitle: 'The obvious goal may not want you.',
    difficulty: 1,
    spawn: { x: 70, y: SPAWN_Y },
    exit:  { x: 880, y: GROUND_Y + 16, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 250, FLOOR_H),                                // start
      plat(300, GROUND_Y, 320, 20),                                   // upper hall
      plat(660, GROUND_Y, 300, 20),                                   // upper fake door ledge
      plat(400, GROUND_Y + 70, 560, 22),                              // lower duct passage
    ],
    hazards: [
      spike(255, SPIKE_Y, 140, SPIKE_H),
    ],
    traps: [
      // Reactive wall drops to seal upper decoy portal
      { type: 'reactiveWall', x: 790, y: GROUND_Y - 90, width: 22, height: 90, targetY: GROUND_Y - 20, speed: 3.5, triggerDistance: 130 },
      // Decoy door placed on upper ledge
      { type: 'decoyObject', x: 880, y: DOOR_Y, width: 28, height: 28 },
    ],
    secret: { x: 440, y: GROUND_Y - 40, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 3: "Commitment"
     Arc 1: Objects behave unexpectedly.
     A long bridge lined with one-way ratchet teeth. Walking
     forward is smooth; retreating triggers razor spikes.
     Solution: Move forward without hesitation.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_03',
    title: 'Commitment',
    subtitle: 'Once you begin, there is no turning back.',
    difficulty: 2,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 880, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 180, FLOOR_H),                                // start
      plat(740, GROUND_Y, 220, FLOOR_H),                              // goal
    ],
    hazards: [
      spike(185, SPIKE_Y, 550, SPIKE_H),
    ],
    traps: [
      // One-way return trap across the central bridge
      { type: 'returnTrap', x: 190, y: GROUND_Y, width: 540, height: 16, forwardBoundaryX: 620 },
    ],
    secret: { x: 50, y: GROUND_Y - 120, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 4: "The False Haven"
     Arc 2: Visual cues can be misleading.
     A perilous gauntlet with a welcoming "REST ZONE" canopy.
     Lingering charges a lethal overhead hazard.
     Solution: Sprint straight through without resting.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_04',
    title: 'The False Haven',
    subtitle: 'Comfort is the most dangerous trap.',
    difficulty: 2,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 200, FLOOR_H),
      plat(720, GROUND_Y, 240, FLOOR_H),
    ],
    hazards: [
      spike(205, SPIKE_Y, 190, SPIKE_H),
      spike(565, SPIKE_Y, 150, SPIKE_H),
    ],
    traps: [
      // Fake Safe Zone on the middle island
      { type: 'fakeSafeZone', x: 400, y: GROUND_Y - 65, width: 160, height: 65, chargeTime: 750 },
    ],
    secret: { x: 480, y: GROUND_Y - 95, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 5: "The Misdirected Button"
     Arc 2: Visual cues can be misleading.
     A glowing purple orb button screams "PRESS ME", but triggers
     a curse. An unassuming stone switch is the real trigger.
     Solution: Ignore the purple orb; step on the stone plate.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_05',
    title: 'The Misdirected Button',
    subtitle: 'The brightest light is rarely the answer.',
    difficulty: 2,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 260, FLOOR_H),                                // start
      plat(700, GROUND_Y, 260, FLOOR_H),                              // goal
      // Switch-activated bridge across pit (group 5)
      plat(270, GROUND_Y, 420, FLOOR_H, { group: 5, visible: false, solid: false }),
    ],
    hazards: [
      spike(265, SPIKE_Y, 430, SPIKE_H),
    ],
    traps: [
      // Real timing switch on the starting ledge
      { type: 'timingSwitch', x: 200, y: GROUND_Y - 30, width: 24, height: 30, duration: 4000, targetGroupId: 5 },
      // Decoy alluring golden object on upper pedestal
      { type: 'decoyObject', x: 500, y: GROUND_Y - 140, width: 28, height: 28 },
    ],
    secret: { x: 120, y: GROUND_Y - 100, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 6: "The Dormant Spike"
     Arc 2: Visual cues can be misleading.
     A spike bed is covered by a wooden maintenance plank with
     a green "INACTIVE" light. Stepping on it pops spikes up.
     Solution: Leap cleanly over the plank.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_06',
    title: 'The Dormant Spike',
    subtitle: 'Do not trust disabled machinery.',
    difficulty: 2,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 280, FLOOR_H),
      plat(640, GROUND_Y, 320, FLOOR_H),
    ],
    hazards: [
      spike(285, SPIKE_Y, 350, SPIKE_H),
    ],
    traps: [
      // Confidence trap covering the spike gap
      { type: 'confidenceTrap', x: 380, y: GROUND_Y - 15, width: 160, height: 16, dormancyDelay: 280 },
    ],
    secret: { x: 720, y: GROUND_Y - 100, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 7: "Unlearning Jump"
     Arc 3: Previous knowledge as liability.
     A massive gap provokes the jump reflex. Jumping drops
     ceiling spikes. Walking forward reveals an invisible glass bridge.
     Solution: Do not jump; just walk straight across.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_07',
    title: 'Unlearning Jump',
    subtitle: 'Your instincts are trained to betray you.',
    difficulty: 3,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 240, FLOOR_H),
      // Invisible solid glass path spanning the chasm
      plat(240, GROUND_Y, 420, FLOOR_H, { type: 'vanish_on_jump', group: 7 }),
      plat(660, GROUND_Y, 300, FLOOR_H),
    ],
    hazards: [
      spike(245, SPIKE_Y, 410, SPIKE_H),
    ],
    traps: [
      // Jumping inside the zone collapses the invisible bridge
      { type: 'vanish_on_jump', triggerZone: { x: 230, y: 0, w: 440, h: GROUND_Y }, group: 7 },
    ],
    secret: { x: 450, y: GROUND_Y - 90, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 8: "The Polarity Inversion"
     Arc 3: Previous knowledge as liability.
     Twin rune paths. Polarity flips deterministically between
     player attempts.
     Solution: Read the glowing rune light frequency.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_08',
    title: 'The Polarity Inversion',
    subtitle: 'What worked yesterday will fail today.',
    difficulty: 3,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 220, FLOOR_H),
      plat(660, GROUND_Y, 300, FLOOR_H),
    ],
    hazards: [
      spike(225, SPIKE_Y, 430, SPIKE_H),
    ],
    traps: [
      // Memory trap spanning the central abyss
      { type: 'memoryTrap', x: 280, y: GROUND_Y - 30, width: 320, height: 18, collapseDelay: 200 },
    ],
    secret: { x: 740, y: GROUND_Y - 90, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 9: "The False Beacon"
     Arc 3: Previous knowledge as liability.
     A glowing green checkpoint beacon sits midway. Touching
     it triggers an immediate pit collapse.
     Solution: Leap cleanly over the fake checkpoint.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_09',
    title: 'The False Beacon',
    subtitle: 'Not every checkpoint is a sanctuary.',
    difficulty: 3,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 300, FLOOR_H),
      plat(600, GROUND_Y, 360, FLOOR_H),
    ],
    hazards: [
      spike(305, SPIKE_Y, 290, SPIKE_H),
    ],
    traps: [
      // Middle platform holding the false beacon collapses immediately on touch
      { type: 'delayedPlatform', x: 400, y: GROUND_Y - 20, width: 80, height: 20, delay: 180 },
      // Decoy beacon
      { type: 'decoyObject', x: 428, y: GROUND_Y - 60, width: 24, height: 24 },
    ],
    secret: { x: 540, y: GROUND_Y - 90, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 10: "Kinetic Commitment"
     Arc 4: Combine two concepts.
     Frictionless momentum runway leading into a one-way return trap.
     Solution: Ride the slide and jump without trying to brake backward.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_10',
    title: 'Kinetic Commitment',
    subtitle: 'Friction is gone. Hesitation is fatal.',
    difficulty: 3,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 180, FLOOR_H),
      plat(760, GROUND_Y, 200, FLOOR_H),
    ],
    hazards: [
      spike(185, SPIKE_Y, 570, SPIKE_H),
    ],
    traps: [
      // Frictionless ice runway
      { type: 'momentumTrap', x: 200, y: GROUND_Y - 15, width: 260, height: 18, mode: 'frictionless' },
      // Return trap right after landing
      { type: 'returnTrap', x: 480, y: GROUND_Y - 15, width: 260, height: 18, forwardBoundaryX: 680 },
    ],
    secret: { x: 330, y: GROUND_Y - 90, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 11: "The Shifting Staircase"
     Arc 4: Combine two concepts.
     Ascending delayed platforms underneath a reactive wall.
     Solution: Bait the reactive wall, then sprint across the collapsing steps.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_11',
    title: 'The Shifting Staircase',
    subtitle: 'Watch above as carefully as below.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 880, y: GROUND_Y - 120, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 200, FLOOR_H),
      plat(680, GROUND_Y - 60, 280, FLOOR_H + 60),
    ],
    hazards: [
      spike(205, SPIKE_Y, 470, SPIKE_H),
    ],
    traps: [
      // Delayed step 1
      { type: 'delayedPlatform', x: 260, y: GROUND_Y - 20, width: 85, height: 18, delay: 650 },
      // Delayed step 2
      { type: 'delayedPlatform', x: 380, y: GROUND_Y - 50, width: 85, height: 18, delay: 550 },
      // Delayed step 3
      { type: 'delayedPlatform', x: 500, y: GROUND_Y - 80, width: 85, height: 18, delay: 550 },
      // Overhead reactive wall drops down when jumping
      { type: 'reactiveWall', x: 600, y: GROUND_Y - 220, width: 24, height: 110, targetY: GROUND_Y - 130, speed: 2.8, triggerDistance: 130 },
    ],
    secret: { x: 100, y: GROUND_Y - 100, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 12: "The Timed Sanctuary"
     Arc 4: Combine two concepts.
     A timing switch deploys a bridge across spikes, but the bridge
     crosses directly through a fake safe zone.
     Solution: Hit the switch and sprint without lingering in the safe zone.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_12',
    title: 'The Timed Sanctuary',
    subtitle: 'Haste and patience in contradiction.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 220, FLOOR_H),
      plat(760, GROUND_Y, 200, FLOOR_H),
      // Timed bridge (group 12)
      plat(240, GROUND_Y, 500, FLOOR_H, { group: 12, visible: false, solid: false }),
    ],
    hazards: [
      spike(225, SPIKE_Y, 530, SPIKE_H),
    ],
    traps: [
      // Timing switch
      { type: 'timingSwitch', x: 180, y: GROUND_Y - 30, width: 24, height: 30, duration: 3800, targetGroupId: 12 },
      // Fake safe zone on the bridge
      { type: 'fakeSafeZone', x: 440, y: GROUND_Y - 65, width: 140, height: 65, chargeTime: 700 },
    ],
    secret: { x: 510, y: GROUND_Y - 95, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 13: "The Gauntlet of Second Guesses"
     Arc 5: Multi-stage psychological setups.
     Stage 1: Delayed step. Stage 2: Rune polarity gate. Stage 3: Decoy.
     Solution: Master all 3 stages sequentially.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_13',
    title: 'The Gauntlet of Second Guesses',
    subtitle: 'Every step asks a question.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 180, FLOOR_H),
      plat(440, GROUND_Y, 120, FLOOR_H),
      plat(780, GROUND_Y, 180, FLOOR_H),
    ],
    hazards: [
      spike(185, SPIKE_Y, 250, SPIKE_H),
      spike(565, SPIKE_Y, 210, SPIKE_H),
    ],
    traps: [
      // Stage 1: Delayed platform
      { type: 'delayedPlatform', x: 230, y: GROUND_Y - 25, width: 90, height: 18, delay: 600 },
      // Stage 2: Memory rune trap on the second gap
      { type: 'memoryTrap', x: 580, y: GROUND_Y - 25, width: 180, height: 18, collapseDelay: 220 },
      // Stage 3: Decoy golden artifact near the door
      { type: 'decoyObject', x: 840, y: DOOR_Y - 60, width: 24, height: 24 },
    ],
    secret: { x: 500, y: GROUND_Y - 60, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 14: "The Mirror of Assumptions"
     Arc 5: Multi-stage psychological setups.
     Upper advertised "SAFE ROUTE" is loaded with reactive walls.
     Lower dark conduit is completely calm and safe.
     Solution: Reject the advertised route and take the lower path.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_14',
    title: 'The Mirror of Assumptions',
    subtitle: 'Safety announced is safety compromised.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: GROUND_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 180, FLOOR_H),                                // start
      plat(220, GROUND_Y - 100, 480, 20),                             // upper "advertised" route
      plat(220, GROUND_Y + 10, 480, 20),                              // lower dark quiet route
      plat(740, GROUND_Y, 220, FLOOR_H),                              // goal
    ],
    hazards: [
      spike(185, SPIKE_Y, 30, SPIKE_H),
    ],
    traps: [
      // Upper route reactive walls and drop traps
      { type: 'reactiveWall', x: 440, y: GROUND_Y - 190, width: 22, height: 85, targetY: GROUND_Y - 110, speed: 3.5, triggerDistance: 120 },
      { type: 'delayedPlatform', x: 540, y: GROUND_Y - 100, width: 90, height: 20, delay: 450 },
    ],
    secret: { x: 460, y: GROUND_Y - 10, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 15: "That Was Not There"
     Arc 5: Grand Finale.
     Starts as a peaceful corridor with a golden door.
     Approaching triggers falseExit lockdown and reveals the true
     exit on the high balcony. A timing switch and kinetic bridge
     must be used to ascend to the summit.
     Solution: Synthesize all learned psychological mechanics!
     ────────────────────────────────────────────────────── */
  {
    id: 'level_15',
    title: 'That Was Not There',
    subtitle: 'Nothing was ever really there.',
    difficulty: 5,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 870, y: 110, w: DOOR_W, h: DOOR_H },                // real exit on observation deck
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 200, FLOOR_H),                                // start
      plat(240, GROUND_Y - 50, 110, 18),                              // step 1
      plat(420, GROUND_Y - 110, 110, 18),                             // step 2 (delayed)
      plat(600, GROUND_Y - 170, 110, 18),                             // step 3
      plat(800, 166, 160, 20),                                        // summit observation deck (exit location)
      plat(580, GROUND_Y, 380, FLOOR_H),                              // lower floor holding false door
      // Switch-activated ascending bridge (group 15)
      plat(640, GROUND_Y - 90, 120, 18, { group: 15, visible: false, solid: false }),
    ],
    hazards: [
      spike(205, SPIKE_Y, 370, SPIKE_H),
    ],
    traps: [
      // False exit on lower floor
      {
        type: 'falseExit',
        x: 880,
        y: DOOR_Y,
        width: DOOR_W,
        height: DOOR_H,
        triggerRadius: 110,
        realExitX: 870,
        realExitY: 110,
      },
      // Timing switch on step 1 to deploy summit bridge
      { type: 'timingSwitch', x: 290, y: GROUND_Y - 80, width: 24, height: 30, duration: 4200, targetGroupId: 15 },
      // Delayed platform on step 2
      { type: 'delayedPlatform', x: 420, y: GROUND_Y - 110, width: 110, height: 18, delay: 650 },
      // Reactive wall guarding the summit deck
      { type: 'reactiveWall', x: 770, y: 90, width: 20, height: 80, targetY: 150, speed: 2, triggerDistance: 110 },
    ],
    secret: { x: 860, y: 50, w: 20, h: 20, collected: false },
    completionCondition: 'door',
  },
];

/* ─── Public API ──────────────────────────────────────── */
export function getLevelCount() {
  return LEVELS.length;
}

export function getLevelDef(index) {
  return LEVELS[index] || null;
}

/**
 * Return a clean deep copy for the active game state.
 * Adding level 16 requires only appending to LEVELS above!
 */
export function loadLevel(index) {
  const d = LEVELS[index] || LEVELS[0];
  return {
    id:          d.id,
    title:       d.title,
    subtitle:    d.subtitle,
    difficulty:  d.difficulty || 1,
    spawn:       { ...d.spawn },
    exit:        { ...d.exit },
    camera:      d.camera ? { ...d.camera } : { panX: 0, panY: 0, zoom: 1 },
    platforms:   d.platforms.map(p => ({ ...p })),
    hazards:     (d.hazards || []).map(h => ({ ...h })),
    spikes:      (d.hazards || []).map(h => ({ ...h })), // alias for collision
    traps:       (d.traps || []).map(t => ({ ...t })),
    scriptedEvents: (d.scriptedEvents || []).map(e => ({ ...e, triggered: false })),
    secret:      d.secret ? { ...d.secret, collected: false } : null,
    completionCondition: d.completionCondition || 'door',
  };
}
