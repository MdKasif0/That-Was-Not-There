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
   20 HANDCRAFTED PSYCHOLOGICAL RAGE-BAIT LEVELS
   Organized in 5 Psychological Arcs across 10 Categories
   ═══════════════════════════════════════════════════════════ */
export const LEVELS = [

  /* ──────────────────────────────────────────────────────
     LEVEL 1: "The Hesitant Step"
     Category 8: Confidence / Delayed Platform
     Expectation: Ascending staircase is stable.
     Betrayal: Step 3 shivers and collapses after 550ms.
     Realization: Step 3 is unstable; leap directly to step 4 or tap lightly.
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
      plat(0, GROUND_Y, 220, FLOOR_H),
      plat(240, GROUND_Y - 30, 80, 18),
      plat(350, GROUND_Y - 60, 80, 18),
      plat(570, GROUND_Y - 60, 80, 18),
      plat(680, GROUND_Y, 280, FLOOR_H),
      plat(130, GROUND_Y - 120, 60, 16),
    ],
    hazards: [
      spike(225, SPIKE_Y, 450, SPIKE_H),
    ],
    traps: [
      { type: 'delayedPlatform', x: 460, y: GROUND_Y - 60, width: 80, height: 18, delay: 550 },
    ],
    secret: { x: 150, y: GROUND_Y - 150, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 2: "The Phantom Bridge"
     Category 1: Visual Assumption
     Expectation: Upper bridge looks solid and inviting.
     Betrayal: Upper span has no collision; true path is lower stone duct.
     Realization: The upper bridge was an optical projection; take the lower passage.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_02',
    title: 'The Phantom Bridge',
    subtitle: 'Seeing is not always feeling.',
    difficulty: 1,
    spawn: { x: 70, y: SPAWN_Y },
    exit:  { x: 880, y: GROUND_Y + 16, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 220, FLOOR_H),
      plat(680, GROUND_Y, 280, FLOOR_H),
      // True lower solid walkway
      plat(240, GROUND_Y + 60, 420, 24),
    ],
    hazards: [
      spike(225, SPIKE_Y, 450, SPIKE_H),
    ],
    traps: [
      // Phantom bridge spanning the upper chasm
      { type: 'phantomPlatform', x: 240, y: GROUND_Y - 30, width: 420, height: 18 },
    ],
    secret: { x: 120, y: GROUND_Y - 80, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 3: "The Third Pillar"
     Category 8: Confidence Trap
     Expectation: Three evenly spaced stepping columns are identical.
     Betrayal: Pillar 1 and 2 are rock solid; pillar 3 drops immediately on contact.
     Realization: The rhythm was conditioned to bait automated jumping.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_03',
    title: 'The Third Pillar',
    subtitle: 'Rhythm is a dangerous habit.',
    difficulty: 2,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 880, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 180, FLOOR_H),
      plat(240, GROUND_Y - 35, 75, 18),  // Pillar 1: Solid
      plat(380, GROUND_Y - 35, 75, 18),  // Pillar 2: Solid
      plat(660, GROUND_Y, 300, FLOOR_H), // Landing
    ],
    hazards: [
      spike(185, SPIKE_Y, 470, SPIKE_H),
    ],
    traps: [
      // Pillar 3 drops immediately on contact
      { type: 'thirdPillar', x: 520, y: GROUND_Y - 35, width: 75, height: 18, delay: 100 },
    ],
    secret: { x: 80, y: GROUND_Y - 110, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 4: "The Spotlight"
     Category 10: Attention Trap
     Expectation: Giant swinging pendulum overhead commands full focus.
     Betrayal: Staring upward causes player to walk onto silent floor spike trigger.
     Realization: The swinging blade was visual noise; floor trigger was the threat.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_04',
    title: 'The Spotlight',
    subtitle: 'Where you look is where you lose.',
    difficulty: 2,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 960, FLOOR_H),
    ],
    hazards: [],
    traps: [
      { type: 'spotlightDecoy', x: 380, y: 0, width: 180, height: 220, triggerX: 470 },
    ],
    secret: { x: 500, y: GROUND_Y - 120, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 5: "The Commitment Gate"
     Category 2: Timing Assumption
     Expectation: Overhead crusher operates on a timer or stays still.
     Betrayal: Crusher snaps down only after player commits mid-air past the threshold.
     Realization: Jumping committed the trap; a low glide or early jump-cut clears it.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_05',
    title: 'The Commitment Gate',
    subtitle: 'The trap waits for your certainty.',
    difficulty: 2,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 220, FLOOR_H),
      plat(360, GROUND_Y - 25, 90, 18),
      plat(700, GROUND_Y, 260, FLOOR_H),
    ],
    hazards: [
      spike(225, SPIKE_Y, 470, SPIKE_H),
    ],
    traps: [
      { type: 'commitmentTrigger', x: 530, y: GROUND_Y - 180, width: 60, height: 90, triggerX: 410, targetY: GROUND_Y - 25, speed: 9 },
    ],
    secret: { x: 120, y: GROUND_Y - 90, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 6: "The Steep Angle"
     Category 3: Spatial Assumption
     Expectation: Central floating island is wide, flat, and inviting.
     Betrayal: High vertical approach trajectory trips ceiling drop hazard.
     Realization: Landing is safe, but high plunge angle trips tripwire; glide low.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_06',
    title: 'The Steep Angle',
    subtitle: 'The trajectory matters as much as the target.',
    difficulty: 2,
    spawn: { x: 60, y: SPAWN_Y - 90 },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y - 90, 180, FLOOR_H + 90),
      plat(320, GROUND_Y - 20, 220, 20),
      plat(680, GROUND_Y, 280, FLOOR_H),
    ],
    hazards: [
      spike(185, SPIKE_Y, 130, SPIKE_H),
      spike(545, SPIKE_Y, 130, SPIKE_H),
    ],
    traps: [
      { type: 'approachAngleTrap', x: 320, y: GROUND_Y - 20, width: 220, height: 20, maxSafeVy: 3.5, hazardY: GROUND_Y - 150 },
    ],
    secret: { x: 740, y: GROUND_Y - 90, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 7: "The Teetering Ledge"
     Category 3: Spatial / Fulcrum
     Expectation: Suspended span is a stable horizontal bridge.
     Betrayal: Committing weight past the center fulcrum tilts the platform into the pit.
     Realization: It is a seesaw; land near the pivot anchor to keep it balanced.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_07',
    title: 'The Teetering Ledge',
    subtitle: 'Balance is not guaranteed.',
    difficulty: 3,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 200, FLOOR_H),
      plat(720, GROUND_Y, 240, FLOOR_H),
    ],
    hazards: [
      spike(205, SPIKE_Y, 510, SPIKE_H),
    ],
    traps: [
      { type: 'tiltFulcrumTrap', x: 260, y: GROUND_Y - 20, width: 400, height: 18, maxAngle: 0.44 },
    ],
    secret: { x: 460, y: GROUND_Y - 80, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 8: "The Decelerating Barrier"
     Category 2: Timing / Speed
     Expectation: Rushing is required to slip under closing door.
     Betrayal: High sprint speed triggers velocity sensor that slams gate shut.
     Realization: Rushing was the trigger; approaching calmly leaves the door open.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_08',
    title: 'The Decelerating Barrier',
    subtitle: 'Haste creates the obstruction.',
    difficulty: 3,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 500, FLOOR_H),
      plat(570, GROUND_Y, 390, FLOOR_H),
    ],
    hazards: [],
    traps: [
      { type: 'deceleratingGate', x: 510, y: GROUND_Y - 85, width: 24, height: 85, closedY: GROUND_Y - 5, maxSafeSpeed: 2.7 },
    ],
    secret: { x: 250, y: GROUND_Y - 90, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 9: "The Inverted Chevron"
     Category 5: Object Identity
     Expectation: Chevron pad is a launch pad booster.
     Betrayal: Chevron points downward and slams velocity into the pit.
     Realization: Glyph points downward; leap cleanly over it to the wall ledge.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_09',
    title: 'The Inverted Chevron',
    subtitle: 'Direction is a matter of perception.',
    difficulty: 3,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 260, FLOOR_H),
      plat(640, GROUND_Y, 320, FLOOR_H),
    ],
    hazards: [
      spike(265, SPIKE_Y, 370, SPIKE_H),
    ],
    traps: [
      // Downward springboard
      { type: 'decoySpringboard', x: 380, y: GROUND_Y - 12, width: 70, height: 14 },
    ],
    secret: { x: 120, y: GROUND_Y - 100, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 10: "The Coveted Shortcut"
     Category 4: Route Assumption
     Expectation: High shortcut offers fast bypass of lower maze.
     Betrayal: Taking upper shortcut elevates exit door into ceiling pocket.
     Realization: The shortcut sabotages the goal; winding lower path is true route.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_10',
    title: 'The Coveted Shortcut',
    subtitle: 'The easy path destroys the destination.',
    difficulty: 3,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 180, FLOOR_H),
      // Lower path
      plat(220, GROUND_Y, 440, FLOOR_H),
      // Upper shortcut ledge
      plat(220, GROUND_Y - 120, 240, 18),
      plat(700, GROUND_Y, 260, FLOOR_H),
    ],
    hazards: [
      spike(185, SPIKE_Y, 30, SPIKE_H),
      spike(665, SPIKE_Y, 30, SPIKE_H),
    ],
    traps: [
      { type: 'collapsingShortcut', x: 260, y: GROUND_Y - 140, width: 160, height: 30 },
    ],
    secret: { x: 440, y: GROUND_Y - 50, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 11: "The Mimic Portal"
     Category 5: Object Identity
     Expectation: Obvious door at the end completes the level.
     Betrayal: Touching obvious door snaps razor jaws; real door hidden in alcove.
     Realization: The mimic door lacked authentic golden particles.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_11',
    title: 'The Mimic Portal',
    subtitle: 'That was not the exit.',
    difficulty: 3,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 580, y: GROUND_Y - 140, w: DOOR_W, h: DOOR_H }, // True exit in upper alcove
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 960, FLOOR_H),
      plat(540, GROUND_Y - 80, 160, 20), // Upper alcove ledge
    ],
    hazards: [],
    traps: [
      // Mimic door on ground floor
      { type: 'mimicExit', x: 880, y: DOOR_Y, width: DOOR_W, height: DOOR_H },
    ],
    secret: { x: 780, y: GROUND_Y - 60, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 12: "The Threshold Lock"
     Category 4: Route / Seal
     Expectation: Scout forward and retreat if needed.
     Betrayal: Crossing threshold drops wall behind; hesitation causes floor collapse.
     Realization: Once crossed, forward momentum is mandatory.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_12',
    title: 'The Threshold Lock',
    subtitle: 'Retreat is an illusion.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 200, FLOOR_H),
      plat(280, GROUND_Y, 220, 20),
      plat(560, GROUND_Y, 400, FLOOR_H),
    ],
    hazards: [
      spike(205, SPIKE_Y, 70, SPIKE_H),
      spike(505, SPIKE_Y, 50, SPIKE_H),
    ],
    traps: [
      { type: 'routeSealTrap', x: 280, y: 0, width: 20, height: CANVAS_H, triggerX: 280, barrierX: 240 },
    ],
    secret: { x: 380, y: GROUND_Y - 60, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 13: "Unlearning Jump"
     Category 7: Reversal
     Expectation: Deep chasm prompts automatic jump reflex.
     Betrayal: Jumping dematerializes invisible bridge and drops spikes.
     Realization: Do not jump; walk straight across the glass bridge.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_13',
    title: 'Unlearning Jump',
    subtitle: 'Your instincts are trained to betray you.',
    difficulty: 3,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 220, FLOOR_H),
      plat(680, GROUND_Y, 280, FLOOR_H),
    ],
    hazards: [
      spike(225, SPIKE_Y, 450, SPIKE_H),
    ],
    traps: [
      { type: 'vanishOnJumpRefined', x: 220, y: GROUND_Y, width: 460, height: FLOOR_H },
    ],
    secret: { x: 450, y: GROUND_Y - 80, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 14: "The Polarity Inversion"
     Category 6: Memory
     Expectation: Diamond platforms were safe; circle platforms collapsed.
     Betrayal: On alternate retries, polarity flips (Diamond collapses, Circle is safe).
     Realization: Read the active polarity symbol indicated in room structure.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_14',
    title: 'The Polarity Inversion',
    subtitle: 'What worked yesterday will fail today.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 180, FLOOR_H),
      plat(700, GROUND_Y, 260, FLOOR_H),
    ],
    hazards: [
      spike(185, SPIKE_Y, 510, SPIKE_H),
    ],
    traps: [
      { type: 'symbolInversion', x: 240, y: GROUND_Y - 30, width: 140, height: 18, symbol: 'diamond' },
      { type: 'symbolInversion', x: 440, y: GROUND_Y - 30, width: 140, height: 18, symbol: 'circle' },
    ],
    secret: { x: 740, y: GROUND_Y - 90, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 15: "The Stride Tax"
     Category 7: Reversal / Kinetic
     Expectation: Full sprint is always best for speed.
     Betrayal: Continuous running overheats the thermal floor.
     Realization: Micro-pause for 150ms to discharge thermal buildup.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_15',
    title: 'The Stride Tax',
    subtitle: 'Velocity carries an unseen charge.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 180, FLOOR_H),
      plat(740, GROUND_Y, 220, FLOOR_H),
    ],
    hazards: [
      spike(185, SPIKE_Y, 550, SPIKE_H),
    ],
    traps: [
      { type: 'stopAndGo', x: 200, y: GROUND_Y - 15, width: 520, height: 18, maxHeat: 680 },
    ],
    secret: { x: 460, y: GROUND_Y - 70, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 16: "Polarity Shift"
     Category 7: Reversal / Controls
     Expectation: Normal steering through mid-air energy field.
     Betrayal: Field inverts left/right steering mid-jump.
     Realization: Steer opposite while crossing the blue field.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_16',
    title: 'Polarity Shift',
    subtitle: 'Your hands disagree with your eyes.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 220, FLOOR_H),
      plat(640, GROUND_Y, 320, FLOOR_H),
    ],
    hazards: [
      spike(225, SPIKE_Y, 410, SPIKE_H),
    ],
    traps: [
      { type: 'polarityShiftField', x: 340, y: GROUND_Y - 140, width: 180, height: 140 },
    ],
    secret: { x: 740, y: GROUND_Y - 90, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 17: "The Glitched Cadence"
     Category 9: Pattern Disruption
     Expectation: Oscillating steps follow predictable 1-2-1-2 rhythm.
     Betrayal: Step 4 has a deterministic phase hitch, throwing off timing.
     Realization: Watch the light pulse to time the metric exception.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_17',
    title: 'The Glitched Cadence',
    subtitle: 'Patterns are promises waiting to break.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 180, FLOOR_H),
      plat(240, GROUND_Y - 40, 80, 18),
      plat(380, GROUND_Y - 40, 80, 18),
      plat(700, GROUND_Y, 260, FLOOR_H),
    ],
    hazards: [
      spike(185, SPIKE_Y, 510, SPIKE_H),
    ],
    traps: [
      { type: 'patternDisruption', x: 520, y: GROUND_Y - 40, width: 85, height: 18, stepIndex: 3 },
    ],
    secret: { x: 120, y: GROUND_Y - 110, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 18: "The Fleeing Goalpost"
     Category 10: Attention / Spatial
     Expectation: Sprinting into the visible exit door completes the room.
     Betrayal: Sprinting causes the door to slide away into a pit.
     Realization: Approach at controlled pace to enter safely.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_18',
    title: 'The Fleeing Goalpost',
    subtitle: 'Greed repels the objective.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 880, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 960, FLOOR_H),
    ],
    hazards: [
      spike(650, SPIKE_Y, 80, SPIKE_H),
    ],
    traps: [
      { type: 'shiftingExit', x: 880, y: DOOR_Y, shiftDist: 160 },
    ],
    secret: { x: 440, y: GROUND_Y - 80, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 19: "The Reluctant Haven"
     Category 8: Confidence / Timing
     Expectation: Green haven platform provides resting sanctuary.
     Betrayal: Lingering inside > 450ms charges lethal electrical discharge.
     Realization: Sanctuary is temporary; keep moving immediately.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_19',
    title: 'The Reluctant Haven',
    subtitle: 'Comfort is the prelude to failure.',
    difficulty: 4,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 890, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 200, FLOOR_H),
      plat(360, GROUND_Y - 50, 160, 20),
      plat(700, GROUND_Y, 260, FLOOR_H),
    ],
    hazards: [
      spike(205, SPIKE_Y, 150, SPIKE_H),
      spike(525, SPIKE_Y, 170, SPIKE_H),
    ],
    traps: [
      { type: 'safeZone', x: 360, y: GROUND_Y - 90, width: 160, height: 60, maxStay: 450 },
    ],
    secret: { x: 440, y: GROUND_Y - 120, w: 18, h: 18, collected: false },
    completionCondition: 'door',
  },

  /* ──────────────────────────────────────────────────────
     LEVEL 20: "That Was Not There"
     Grand Psychological Synthesis Finale
     Ground door is a mimic trap. True exit is on the summit balcony.
     Combines commitment trigger, shifting platforms, and mimic portal.
     ────────────────────────────────────────────────────── */
  {
    id: 'level_20',
    title: 'That Was Not There',
    subtitle: 'Nothing was ever really there.',
    difficulty: 5,
    spawn: { x: 60, y: SPAWN_Y },
    exit:  { x: 870, y: 110, w: DOOR_W, h: DOOR_H }, // True summit exit
    camera: { panX: 0, panY: 0, zoom: 1 },
    platforms: [
      plat(0, GROUND_Y, 200, FLOOR_H),
      plat(240, GROUND_Y - 50, 100, 18),
      plat(400, GROUND_Y - 110, 100, 18),
      plat(580, GROUND_Y - 170, 100, 18),
      plat(780, 166, 180, 20),           // Summit balcony
      plat(560, GROUND_Y, 400, FLOOR_H), // Ground floor holding mimic door
    ],
    hazards: [
      spike(205, SPIKE_Y, 350, SPIKE_H),
    ],
    traps: [
      // Mimic exit on ground floor
      { type: 'mimicExit', x: 880, y: DOOR_Y, width: DOOR_W, height: DOOR_H },
      // Delayed step on middle ascent
      { type: 'delayedPlatform', x: 400, y: GROUND_Y - 110, width: 100, height: 18, delay: 600 },
      // Commitment trigger guarding summit leap
      { type: 'commitmentTrigger', x: 720, y: 70, width: 40, height: 70, triggerX: 610, targetY: 140, speed: 7 },
    ],
    secret: { x: 860, y: 60, w: 20, h: 20, collected: false },
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
    spikes:      (d.hazards || []).map(h => ({ ...h })),
    traps:       (d.traps || []).map(t => ({ ...t })),
    scriptedEvents: (d.scriptedEvents || []).map(e => ({ ...e, triggered: false })),
    secret:      d.secret ? { ...d.secret, collected: false } : null,
    completionCondition: d.completionCondition || 'door',
  };
}
