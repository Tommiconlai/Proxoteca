# HANDOFF — ImpaginaProxies

Context for the next Claude Code session.

## What it is

Vite + React single-page tool. Load images (card faces) → lay them out on a print
sheet (A3/A4/A5/Letter/Legal) with bleed + crop marks → export a print-ready PDF.
UI is in Italian. "Proxies" = trading-card proxies; card size is 63×88 mm.

## Stack

- Vite 7, React 19, `react-dropzone`, `jspdf` (pulls `html2canvas`)
- Vanilla CSS with design tokens in `src/index.css` (no Tailwind / CSS-in-JS)

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run lint
```

Preview via Claude Code: `preview_start "vite-dev"` (config in `.claude/launch.json`,
which is gitignored and auto-created if missing). Screenshot empty AND populated states.
To populate without picking files, inject test images into the dropzone `<input>` with a
`DataTransfer` + dispatched `change` event.

## File map

| File | Role |
|------|------|
| `src/App.jsx` | Root: state (images, format, bleed, dpi), header/sidebar/main layout, thumbnail list |
| `src/components/ImageUploader.jsx` | react-dropzone drop zone |
| `src/components/PageSettings.jsx` | Sidebar: format/bleed/dpi selects + layout mini-preview + info box |
| `src/components/PagePreview.jsx` | ANTEPRIMA: canvas page previews + `PageCanvas` (shared w/ sidebar) + pagination |
| `src/components/VirtualThumbGrid.jsx` | Lazy thumb grid — **currently NOT imported by App** (see TODO) |
| `src/utils/pdfGenerator.js` | Grid math (`getGridInfo`, constants) + `generatePDF` (jspdf, dynamically imported) |
| `src/components/icons.jsx` | Custom lucide-style SVG icon set (currentColor) |
| `src/index.css` | All styling + design tokens |
| `public/favicon.svg` | Branded gold layout-grid mark |

## Design system

Tokens at the top of `src/index.css`. Also recorded in this project's Claude memory
(`design-identity`, `user-design-preferences`).

- **Dark OLED.** `--bg-base #0d0f14`.
- **Accent: warm amber-gold** `--accent #d4923f` / `--accent-light #e6a85a`. On-gold text
  is dark `#1f1606` for contrast. **Do NOT revert to the old indigo `#6c63ff`, and never
  put white text on the gold button** (fails contrast — gold is light).
- **Fonts:** Bricolage Grotesque (`h1/h2/h3`) + Hanken Grotesk (body), loaded in
  `index.html`. `tabular-nums` on numeric data. Deliberately not Inter.
- **Effects:** ambient warm bg glow, film-grain overlay (`body::before`), blue-tinted
  shadows, "light-table" preview (white canvases get edge-ring + depth shadow on an
  elevated panel), staggered fade-up entrance, `prefers-reduced-motion` guard.
- **Warning badge** (`.badge-warning`, "immagini mancanti") = red-coral, kept distinct
  from the gold accent.

## Done recently

Full design pass: UX critique → fixes (contrast 4.5:1, empty-state de-duplication,
responsive `<900px` stack + `100dvh`, touch targets, focus-visible) → custom SVG icons +
branded favicon + header logo/tagline → depth/elevation/light-table → Bricolage+Hanken
type → code-split PDF libs (initial bundle 658 kB → 269 kB; jspdf/html2canvas lazy on
first export) → warm-gold rebrand + grain. All verified live + `npm run build` green.

## Known issues / TODO

- **Lint (3 pre-existing errors)** in `src/components/PagePreview.jsx`:
  `react-hooks/set-state-in-effect` on the page-offset reset/clamp effects. App runs and
  builds fine (`vite build` does not lint). Fix by deriving the clamped offset during
  render instead of in an effect. Needs populated-state testing.
- **`public/vite.svg`** is dead (favicon switched to `favicon.svg`). Safe to delete.
- **`VirtualThumbGrid.jsx`** is not imported anywhere — App renders a plain filename list.
  Decide: wire it in (for large image sets) or remove.
- **A11y:** sidebar `<select>`s are labeled by `<h2>` section titles, not `<label for>` /
  `aria-label`. Functional but could be improved.
- **No tests.**

## Conventions

- Commit/push only when asked. Repo is solo, history is direct-to-`main`.
- After UI edits: run the app, screenshot empty + populated, then `npm run build`.
- Treat "AI-default" looks (Inter, generic purple, emoji icons) as signals to diverge.
