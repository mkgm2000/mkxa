# Handoff: Mood Characters

## Overview
A set of 10 animated "blob" mascots that visually represent the user's emotional state in a mood/wellness app. Each character sits on a mood-tinted card with idle animation, mood-specific motion, and optional ambient particles. They're designed to be dropped into UI surfaces like onboarding, daily check-in, dashboard cards, or test result tiles.

The 10 moods are: **Happy, Joyful, Annoyed, Worried, Dizzy, Sad, Angry, In love, Sleepy, Neutral**.

## About the Design Files
The file in this bundle (`Mood Characters.html`) is a **design reference created in HTML/CSS/SVG** — a prototype showing the intended look, motion, and ambient effects, not production code to ship as-is. The task is to **recreate these characters in the target codebase's existing environment** (React + CSS-in-JS, React Native + Reanimated, SwiftUI, Lottie, Rive, etc.) using its established patterns. If there's no environment yet, choose what fits best — the SVG paths and CSS keyframes here translate cleanly to any modern UI runtime.

Each character is just an SVG with a body path + face elements. Animations are CSS keyframes layered on wrappers (body wrapper for float/bounce, inner SVG for breathe/squash, sub-groups for spinning eyes / quivering mouth, absolutely-positioned `<i>` elements for ambient particles).

## Fidelity
**High-fidelity.** Final colors, gradients, motion curves, and proportions. Recreate pixel-perfect — geometry, color stops, animation timings and easings are all intentional.

## Characters

Each character shares the same overall structure:

- **Body** — egg-shaped path with a 3-stop linear gradient (light → mid → dark), a soft inner highlight on top (`hiX` radial), and an inner ground shading (`shadeX` radial) at the bottom.
- **Face elements** — eyes, mouth, sometimes brows / cheeks.
- **Floor shadow** — separate ellipse beneath the blob; pulses with the bounce.
- **Idle animation** — body floats up/down + SVG breathes (squash/stretch).
- **Mood-specific layer** — extra motion (shake, sway, spin, etc.) and/or ambient particles.

### Shared body path (viewBox 0 0 220 220)
```
M110 14 C 58 14, 20 56, 20 114
        C 20 162, 56 198, 110 198
        C 164 198, 200 162, 200 114
        C 200 56, 162 14, 110 14 Z
```
- Top highlight: `<ellipse cx="110" cy="58" rx="68" ry="42" fill="url(#hiX)" />`
- Bottom shading: `<ellipse cx="110" cy="170" rx="80" ry="28" fill="url(#shadeX)" />`

### Per-mood spec

| Mood | Body gradient (top → mid → bottom) | Card background gradient (170°) | Face | Specific animation | Ambient particles |
|---|---|---|---|---|---|
| Happy   | `#ffe4a8 → #fbc25a → #d88a1c` | `#fff4d8 → #ffd987` | Closed smiling eyes (Q-arcs up), peach cheeks `#f29a72 @0.6`, wide smile | `float-happy` 1.8s — bounce w/ squash | 3 sparkles (white) |
| Joyful  | `#b8f0dd → #54c6a6 → #218e72` | `#d6f5ea → #8de2c9` | Small solid black oval eyes, dark-green cheeks `#1f7a63 @0.35`, simple smile arc | `float-joy` 2.2s — hop + tilt ±3° | 3 sparkles (white) |
| Annoyed | `#d6bfff → #9577f0 → #6244b6` | `#ece0ff → #c4a3ff` | Half-closed lidded eyes (white slits + black lid line + pupil dot), flat line mouth | `float` 6s + `eye-roll` 5s on `.eye-roll` group | — |
| Worried | `#ffe6b0 → #fac466 → #cb8519` | `#fff1d6 → #ffd07a` | Sad eyebrows, small black oval eyes, wavy mouth (3-bump Q-chain) | `sway` 3.2s + `mouth-quiver` 0.9s on `.worry-mouth` | 1 sweat drop (top-right) |
| Dizzy   | `#ffc4c6 → #f47179 → #a13540` | `#ffe0e1 → #ff9ca0` | Two white spiral paths (`.spiral-l`, `.spiral-r`), flat mouth | `wobble` 2.4s (rotate ±4°) + `spin` 2.5s linear on spirals (right reversed) | — |
| Sad     | `#c4d3ff → #7891f0 → #3e57bf` | `#e3ecff → #a3bcff` | Sad brows, droopy curved eyes (inverted Q), big frown arc | `droop` 4.2s (slow up/down) + `tear-fall` 2.6s on `.tear` (path inside SVG) | — |
| Angry   | `#ffbbbb → #ee5e5e → #982929` | `#ffdcdc → #ff7e7e` | Angled-down angry brows, small solid eyes, grimace arc | `angry-shake` 0.18s linear — fast vibrate | 3 white steam puffs (top of head) |
| In love | `#ffd0db → #ff80a0 → #b6315a` | `#ffe2ec → #ffa3bc` | Two red `#e23a5a` heart paths (`.heart-eye`), small smile | `love-pulse` 1.6s + `heart-thump` 1.6s on heart eyes | 3 floating hearts rising up |
| Sleepy  | `#e0d2ff → #a48be0 → #5b449a` | `#ece4ff → #b9a3e8` | Closed downward-curving eyes, small black mouth ellipse | `float` 5.5s (very slow) | 3 "Z" letters rising at different sizes |
| Neutral | `#f2eadb → #cdbe9d → #7d6d4d` | `#f0eee9 → #d6cfc1` | Small solid black eyes, straight horizontal line mouth | base `float` 3.4s + `breathe` 3.4s | — |

## Card layout

Each card is a fixed `aspect-ratio: 1 / 1.08` tile, `border-radius: 36px`, with the mood gradient as its base and two pseudo-element overlays:
- `::before` — radial highlight top + radial shading bottom (depth)
- `::after` — 3px×3px radial-dot noise texture, `mix-blend-mode: multiply`, opacity 0.6

Box shadow: `0 1px 0 rgba(255,255,255,0.55) inset, 0 24px 50px -28px rgba(20,24,30,0.28)`

The blob occupies a `width: 82%`, `aspect-ratio: 1` stage that sits at the top of the card with `margin: 8% 0 auto`. The label + sub-label sit at the bottom of the card.

## Animations

All keyframes live in the `<style>` block at the top of the HTML. Summary of every named keyframe:

| Keyframe | Used by | Effect |
|---|---|---|
| `float` | base idle + sleepy + annoyed | translateY 0 → -10px → 0 |
| `breathe` | base idle (all SVGs) | scale(1,1) → scale(1.035, 0.965) → 1 — squash & stretch |
| `floor-pulse` | floor shadow | scaleX 1 → 0.72, opacity 0.9 → 0.55 |
| `float-happy` | happy | full bounce cycle with squash on landing |
| `float-joy` | joyful | hop + ±3° tilt + landing squash |
| `eye-roll` | annoyed `.eye-roll` group | 70% rest, then quick 2px,-3px → -2px,-3px → rest |
| `sway` | worried | translateY -4px + rotate ±2° |
| `mouth-quiver` | worried `.worry-mouth` | translateY 0 → 1.5px + scaleX 1.02 |
| `wobble` | dizzy | rotate ±4° + translateY -6px |
| `spin` | dizzy spirals | rotate 0 → 360° (right reversed) |
| `droop` | sad | translateY 0 → 4px + scale(1.02, 0.97) — sinks down |
| `tear-fall` | sad `.tear` | scale 0.6 → 1 then translateY 0 → 60px, opacity 0 → 1 → 0 |
| `angry-shake` | angry | rapid translate ±1.5px + rotate ±1° |
| `love-pulse` | in love | scale 1 → 1.05 + translateY -4px |
| `heart-thump` | in love `.heart-eye` | scale 1 → 1.18 → 0.92 → 1 |
| `sparkle` | sparkle particles | rotate(45°) scale 0.4 → 1 → 0.4, opacity 0 → 1 → 0 |
| `heart-float` | love hearts | translateY 0 → -90px + scale 0.6 → 1.1, opacity 0 → 1 → 0 |
| `zee-rise` | sleepy Zs | translate(0,0) → (20px, -80px) + rotate -6° → 8° + scale 0.6 → 1.2 |
| `steam-rise` | angry steam | translateY 0 → -60px + scale 0.5 → 1.4, opacity 0 → 0.9 → 0 |
| `sweat-drip` | worried sweat | translateY -4px → 40px, opacity 0 → 1 → 0 |
| `pulse` | header status dot | opacity + scale loop |

**Reduced motion:** the file ends with a `@media (prefers-reduced-motion: reduce)` rule that effectively kills all animations. Preserve this when porting.

## Implementation notes

### Recreating in React
- Each character is a self-contained component. Suggested signature:
  ```tsx
  <MoodBlob mood="happy" size={240} animate />
  ```
- Inline the SVG markup directly in JSX. Don't try to share gradients across multiple instances on the same page unless you namespace the gradient IDs (e.g. append a `useId()` suffix) — duplicate `<linearGradient id="bodyHappy">` will collide.
- For animations, prefer CSS modules / styled-components keyframes over JS animation libraries — these are simple infinite loops, JS gives you nothing here. If you need scrubbable / interactive control (e.g. blob reacts to a mood slider), reach for Framer Motion or Rive.

### Recreating in React Native / mobile
- Use `react-native-svg` for the SVG, `react-native-reanimated` for the keyframes. The squash/stretch + float can be a single `useSharedValue` driving a `useAnimatedStyle` with `withRepeat(withTiming(...))`.
- Particles: easier to do as individually-animated `<Animated.View>` siblings than to try to translate the CSS keyframes literally.

### Recreating as Lottie / Rive
- A skilled motion designer can rebuild these in After Effects (export Lottie) or Rive in a few hours each. Lottie is fine for the simple idle/bounce/sway moods; reach for Rive if you want state-driven blends (e.g. happy → sad transition based on a numeric mood input).

### Asset usage suggestions
- Card surface — use as a daily mood check-in or test-result tile.
- Standalone blob (no card) — use as an avatar/hero in screens like "How are you really feeling today?" — drop the card background, keep the floor shadow.
- Static export — at small sizes (icon-sized, ≤ 48px) animations cost more than they earn; export a flat SVG snapshot.

## Design Tokens

### Card backgrounds (linear-gradient 170°)
| Mood | Top | Bottom |
|---|---|---|
| happy   | `#fff4d8` | `#ffd987` |
| joyful  | `#d6f5ea` | `#8de2c9` |
| annoyed | `#ece0ff` | `#c4a3ff` |
| worried | `#fff1d6` | `#ffd07a` |
| dizzy   | `#ffe0e1` | `#ff9ca0` |
| sad     | `#e3ecff` | `#a3bcff` |
| angry   | `#ffdcdc` | `#ff7e7e` |
| love    | `#ffe2ec` | `#ffa3bc` |
| sleepy  | `#ece4ff` | `#b9a3e8` |
| neutral | `#f0eee9` | `#d6cfc1` |

### Body gradients
See per-mood table above — every mood uses a linear gradient with stops at 0%, 55%, 100%.

### Common ink color
`#1b1d1f` — used for all face strokes/fills (eyes, mouths, brows). Slight off-black so it doesn't clash with pure-black device chrome.

### Typography
- Family: `'DM Sans', system-ui, sans-serif` — substitute `Gilroy` (the brand's actual font, per the inspiration screenshot) in production if licensed.
- Label: 19px / 700, letter-spacing -0.012em
- Sub-label: 13px / 400, color `rgba(27,29,31,0.55)`
- Page H1: 40px / 800, letter-spacing -0.025em

### Spacing
- Card padding: `28px 22px 26px`
- Grid gap: 22px
- Page padding: `64px 40px 96px`

### Radii
- Card: 36px
- (No other rounded surfaces — face elements use SVG geometry)

### Shadows
- Card: `0 1px 0 rgba(255,255,255,0.55) inset, 0 24px 50px -28px rgba(20,24,30,0.28)`
- Floor (blob): radial gradient ellipse + 2px blur

## Assets
No external images. Everything is SVG paths + CSS gradients. Fonts come from Google Fonts (`DM Sans` weights 400/500/700/800). For production, swap to `Gilroy` if licensed (the inspiration design's actual face).

## Files
- `Mood Characters.html` — the full reference. 10 cards in a CSS grid, one block of `<style>` with all tokens / keyframes / mood rules at the top, then 10 `<div class="card …">` blocks. Each card is independently readable; lift them one at a time.

## Open questions for the implementer
1. **Mood set scope** — do you need all 10 or a subset? The 5 in the original inspiration are happy, joyful, annoyed, worried, dizzy. Sad / angry / in love / sleepy / neutral are bonus.
2. **Animation budget** — on low-end devices the angry vibrate + sleepy floating Zs can both feel busy. Consider an "ambient particles" toggle in settings.
3. **State transitions** — current design assumes the character is replaced on mood change. A smooth morph would require Rive or hand-tuned WAAPI.
