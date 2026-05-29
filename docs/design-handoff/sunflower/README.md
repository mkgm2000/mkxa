# Handoff: Chubby Sunflower App Icon → Web App

## Overview
A friendly "chubby" sunflower mark with a cute face: 12 plump rounded petals around a seeded brown center, on an optional blue iOS-style squircle tile. Includes a gentle idle animation (bob + sway). The task is to **wire this into a real web app** as the brand mark — favicon, header logo, splash/loading state, PWA icon, and empty-state illustration — using the app's existing component patterns.

This pairs with the "Mood Characters" set from the same project; they share the same chubby, soft-gradient visual language.

## What's in this package
| File | What it is |
|---|---|
| `App Icon Sunflower.html` | The original design reference — large icon + 120/76/48px size previews, animated. Open in a browser to see the intended look & motion. |
| `sunflower.svg` | Standalone, self-contained SVG of the flower only (transparent bg). Drop-in for `<img>`, CSS `background`, or inline. |
| `SunflowerIcon.jsx` | Ready-to-use React component (props: `size`, `withTile`, `animated`, `title`). |
| `sunflower.css` | Styles + keyframes for the squircle tile, idle bob/sway, and an optional spin (loading). Honors `prefers-reduced-motion`. |

## Fidelity
**High-fidelity, production-ready.** Colors, gradients, geometry, and motion timing are final. Recreate/integrate exactly — don't redraw.

## The art (geometry, viewBox `0 0 200 200`)
- **Petals** — 12 ellipses `rx16 ry26`, base petal at `cx100 cy50`, each rotated `i * 30°` around the center `(100,100)`. Fill `url(#sf-petal)`.
- **Center disk** — `circle cx100 cy100 r42`, fill `url(#sf-center)`, plus a soft highlight ellipse `cx90 cy88 rx25 ry21` (`#sf-centerHi`).
- **Seeds** — 13 dark dots `#3a2109 @ 0.55` scattered across the disk.
- **Face** — two black eyes `(88,98)` & `(112,98)` (`rx4.4 ry5.4`) each with a tiny white highlight, a smile `M91 110 Q100 119 109 110` (stroke `#1b1208`, width 3.4), and two orange cheeks `#ff8a5c @ 0.45`.

### Gradients
| id | type | stops |
|---|---|---|
| `sf-petal` | radial (50%,35%, r75%) | `#ffe169` → `#ffc02e` (55%) → `#f59300` |
| `sf-center` | radial (42%,34%, r75%) | `#8a5a2b` → `#6b3f17` (55%) → `#4d2c0d` |
| `sf-centerHi` | radial (40%,30%, r55%) | `#c98a44 @0.85` → transparent |

> ⚠️ **Gradient id collisions:** if you render more than one instance on a page (e.g. header logo + spinner), the shared gradient ids are fine because they're identical definitions — but if you fork variants with different colors, namespace the ids (suffix with React `useId()`), or duplicate `<defs>` will clash.

### Tile (optional blue squircle)
- Background: `linear-gradient(160deg, #bfe6ff 0%, #87c9ff 48%, #6aa8ff 100%)`
- Radius: `22.5%` (iOS superellipse approximation — or use a proper squircle `clip-path` / `mask` if the app already has one)
- Shadow: `0 1px 0 rgba(255,255,255,0.7) inset, 0 12px 28px -12px rgba(40,80,160,0.45)`
- Overlays: top white radial highlight + bottom blue radial shading (see `.sf-tile::before`)
- Flower sits at `84%` of the tile.

## Animation
- **Idle (`.sf-animated`)** — `sf-bob` 3.6s ease-in-out infinite: `translateY 0 → -7px` + `rotate -2° → 2°`. This is the signature motion; use it on the splash/hero.
- **Spin (`.sf-spin`)** — `sf-spin` 4s linear infinite, full rotation. Use as a loading spinner.
- Both are disabled under `prefers-reduced-motion: reduce`.

## How to apply it to the web app

### 1. React component (recommended for in-app usage)
```jsx
import SunflowerIcon from "./SunflowerIcon";
import "./sunflower.css";

// Header logo (flower only, animated on hover — see note)
<SunflowerIcon size={40} animated />

// App splash / loading hero (on the blue tile)
<SunflowerIcon size={160} withTile animated />

// Loading spinner — add the spin class via className
<SunflowerIcon size={48} className="sf-spin" />
```
> If you only want motion on hover, drop `animated` and add a CSS rule:
> `.logo:hover .sf-svg { animation: sf-bob 3.6s ease-in-out infinite; }`

### 2. Favicon / tab icon
Use `sunflower.svg` directly — modern browsers support SVG favicons:
```html
<link rel="icon" type="image/svg+xml" href="/sunflower.svg" />
```
For the tile look in a favicon, pre-render a PNG of the squircle version (see step 4) and add the usual `apple-touch-icon` / sized PNG links.

### 3. PWA / manifest icons
Generate PNGs at 192 & 512 (maskable + any) from the **tiled** version and reference them in `manifest.webmanifest`:
```json
{ "icons": [
  { "src": "/icons/sf-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
  { "src": "/icons/sf-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
]}
```

### 4. Generating PNGs
The HTML reference is the source of truth for the tiled look. To rasterize:
- Quick: open `App Icon Sunflower.html`, screenshot the large icon, or
- Scripted: render `sunflower.svg` inside the `.sf-tile` markup with a headless browser (Playwright `page.screenshot`) at the sizes you need, or use `sharp`/`resvg` on an SVG that includes the tile rect.

### 5. Plain HTML / non-React stacks
Inline the contents of `sunflower.svg`, wrap in a `<span class="sf-tile">` if you want the tile, and include `sunflower.css`. The component is just a thin wrapper around the same markup.

## Design tokens
| Token | Value |
|---|---|
| Petal light / mid / dark | `#ffe169` / `#ffc02e` / `#f59300` |
| Center light / mid / dark | `#8a5a2b` / `#6b3f17` / `#4d2c0d` |
| Seeds | `#3a2109` @ 0.55 |
| Face ink | `#1b1208` |
| Cheeks | `#ff8a5c` @ 0.45 |
| Tile gradient | `#bfe6ff → #87c9ff → #6aa8ff` (160°) |
| Tile radius | 22.5% (squircle) |
| Idle motion | bob 3.6s, translateY 7px + rotate ±2° |

## Open questions for the implementer
1. **Tile or bare?** In-app logo usually looks best as the bare flower; the blue squircle is for OS-level icons (favicon, PWA, app stores). Confirm per placement.
2. **Squircle accuracy** — `border-radius: 22.5%` is an approximation. If pixel-perfect Apple squircle matters (app store), use a real superellipse `mask`/SVG path.
3. **Motion budget** — idle bob is charming on a splash but can distract in a persistent header. Consider hover-only or first-load-only.
4. **Brand color** — the tile is currently sky-blue (complements the sunflower). If the app has a defined brand color, swap the tile gradient to match.
