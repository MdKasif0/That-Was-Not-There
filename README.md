# That Was Not There

> *A 2D browser-based rage-bait platformer built on psychological deception.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Pure Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-e34f26.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

---

## 🎮 Core Concept & The Rage Loop

**"That Was Not There"** is an original expectation-subverting platformer designed around a tight psychological loop:

$$\text{Expectation} \longrightarrow \text{Action} \longrightarrow \text{Betrayal} \longrightarrow \text{Death} \longrightarrow \text{Instant Restart} \longrightarrow \text{Realization} \longrightarrow \text{Attempt Again}$$

The player immediately surveys the room, devises what appears to be an obvious platforming solution, executes it, and is betrayed by deceptive level elements. Death occurs in a fraction of a second, immediately followed by an instantaneous respawn so the player can test their new mental model of the room.

---

## ✨ Features

- **Subversive Level Design**:
  - **Room 1 — "A Simple Stroll"**: Safe-looking tiles suddenly vanish beneath you; the door itself detects your approach and retreats until you trigger the real pathway.
  - **Room 2 — "Look Before You Leap"**: Suspended platforms act as bait, collapsing or hiding spikes, requiring non-intuitive leap trajectories.
  - **Room 3 — "Trust Issues"**: Unpredictable physical triggers, hidden launch pads, and a test of patience and muscle memory.
- **Micro-responsive Platformer Physics**:
  - Tight horizontal acceleration and instant deceleration.
  - Coyote time (jump grace window after leaving ledges).
  - Jump buffering (pre-registering jumps before touching ground).
  - Variable jump height based on keypress duration.
  - Procedural squash-and-stretch rendering animations.
- **Ultra-Fast Respawn Loop**: Zero loading screens, zero menu friction. Death triggers screen shake and particle bursts, instantly resetting the room in milliseconds.
- **Pure Zero-Dependency Stack**:
  - 100% Vanilla JavaScript (ES Modules).
  - HTML5 Canvas rendering with HiDPI / Retina auto-scaling (`devicePixelRatio`).
  - Modular architecture (physics, collision detection, trap state machine, level loader, particle renderer).
  - Progressive Web App (PWA) ready with `manifest.webmanifest` and service worker caching.
  - Responsive mobile layout with dynamic on-screen touch controls.

---

## 🕹️ Controls

| Action | Keyboard | Mobile / Touch |
| :--- | :--- | :--- |
| **Move Left** | `A` or `← Left Arrow` | Left Arrow Button |
| **Move Right** | `D` or `→ Right Arrow` | Right Arrow Button |
| **Jump** | `W`, `↑ Up Arrow`, or `Space` | Up Jump Button |
| **Quick Restart** | `R` | Tap canvas / Auto on death |

---

## 🏗️ Project Architecture

```
That Was Not There/
├── index.html            # Main HTML5 viewport & touch overlay
├── manifest.webmanifest  # PWA configuration
├── sw.js                 # Service worker offline caching
├── assets/
│   └── icon.svg          # Vector icon asset
├── styles/
│   └── main.css          # Dark neon styling, scanlines, responsive canvas
└── src/
    ├── main.js           # Canvas setup, resize handling, engine initialization
    ├── game.js           # Core loop (fixed 60 FPS tick, accumulator), phase management
    ├── state.js          # Centralized game state structure
    ├── constants.js      # Palette, physics constants, canvas sizing (960x540)
    ├── physics.js        # Velocity, gravity, jump buffer, coyote time, squash/stretch
    ├── collision.js      # AABB platform, spike, and door collision detection
    ├── traps.js          # Deceptive trap state machines & trigger volumes
    ├── levels.js         # Level definitions (spawns, platforms, traps, doors)
    ├── renderer.js       # Canvas rendering: glow effects, scanlines, traps, HUD
    └── input.js          # Keyboard & touch event listeners, key state tracking
```

---

## 🚀 Running Locally

Because the project uses modern ES Modules (`type="module"`), it should be served via a local HTTP server:

```bash
# Using npx serve (recommended)
npx -y serve .

# Or using Python 3
python3 -m http.server 3000
```

Then open your browser to `http://localhost:3000`.

---

## 📄 License

MIT License. Designed and built from scratch as an original game.
