// ─── Canvas ───────────────────────────────────────────────
export const CANVAS_W = 960;
export const CANVAS_H = 540;

// ─── Player dimensions ───────────────────────────────────
export const PLAYER_W = 22;
export const PLAYER_H = 26;

// ─── Physics (tuned for 60 fps fixed-step) ───────────────
export const GRAVITY        = 0.55;
export const PLAYER_ACCEL   = 0.65;
export const MAX_SPEED      = 4.5;
export const FRICTION       = 0.78;
export const JUMP_VEL       = -10.8;
export const COYOTE_FRAMES  = 6;
export const JUMP_BUFFER    = 6;

// ─── Timing ──────────────────────────────────────────────
export const DEATH_FREEZE   = 300;   // ms
export const TRANSITION_MS  = 1000;  // ms total (500 out + 500 in)

// ─── Rendering / ground ──────────────────────────────────
export const GROUND_Y = 448;
export const FLOOR_H  = CANVAS_H - GROUND_Y;  // 92

// ─── Colours ─────────────────────────────────────────────
export const C = {
  bg1:           '#08080f',
  bg2:           '#0f0f1a',
  platform:      '#1a1a2e',
  platformEdge:  '#2d2d4a',
  platformGrid:  '#1f1f35',
  vanish:        '#1a1a35',
  vanishEdge:    '#2d2d55',
  player:        '#00e5ff',
  playerDark:    '#0097a7',
  playerEye:     '#ffffff',
  spike:         '#ff1744',
  spikeGlow:     'rgba(255,23,68,0.18)',
  door:          '#ffd740',
  doorFrame:     '#ffc107',
  doorGlow:      'rgba(255,214,64,0.18)',
  text:          '#ffffff',
  textDim:       'rgba(255,255,255,0.35)',
  textHint:      'rgba(255,255,255,0.50)',
  deathCols:     ['#ff1744','#ff5722','#ff9100','#ffea00'],
  doorCols:      ['#ffd740','#ffc107','#ffea00'],
  vanishPart:    '#4a4a7a',
  trapWarn:      '#ff9100',
  trapWarnGlow:  'rgba(255,145,0,0.22)',
  trapActive:    '#ff1744',
  momentumChevrons: '#00e5ff',
  safeZoneAura:  'rgba(0, 230, 118, 0.15)',
  safeZoneBorder:'#00e676',
  safeZoneWarn:  '#ff3d00',
  decoyGlow:     'rgba(255, 215, 0, 0.28)',
  decoyGold:     '#ffd700',
  reactiveWall:  '#2a2a44',
  reactiveEdge:  '#4a4a70',
  switchInactive:'#7c4dff',
  switchActive:  '#00e5ff',
  runeInactive:  'rgba(140, 140, 180, 0.3)',
  runeActive:    '#b388ff',
};
