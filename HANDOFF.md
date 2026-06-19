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
To populate without picking files, inject test images into the hidden `<input type=file>`
with a `DataTransfer` + dispatched `change` event (the + button calls react-dropzone's
`open()`; drag&drop works on the whole preview area).

Gotcha: vite ignores the `PORT` env var, so `autoPort` assigns a port vite won't use —
keep `port: 5173` and, if `preview_stop` leaves the vite child listening on 5173, kill it
before restarting.

## File map

| File | Role |
|------|------|
| `src/App.jsx` | Root: state (images, format, bleed, dpi), header/sidebar/main layout, `react-dropzone` (full-area drag&drop + `open()` for the + button) |
| `src/components/PageSettings.jsx` | Sidebar: format/bleed/dpi selects + layout info box (griglia / immagini per pagina / dimensioni) |
| `src/components/PagePreview.jsx` | Preview: one large centered page (`PageCanvas`) + per-card hover-delete overlay; footer with pager + count + green add-photos button |
| `src/utils/pdfGenerator.js` | Grid math (`getGridInfo`, constants) + `generatePDF` (jspdf, dynamically imported) |
| `src/components/icons.jsx` | Custom lucide-style SVG icon set (currentColor), incl. `IconPlus` |
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
- **Add-photos button** (`.add-photos-btn`) is green `#2ecc71` — a deliberate add/create
  affordance, intentionally distinct from the gold accent and the red delete/warning color.
  Don't recolor it to gold. Per-card delete uses `--danger` (red border + corner ×).

## Done recently

- **Preview image cache:** `PageCanvas` keeps a `src → HTMLImageElement` cache so redraws
  (delete, resize, format change) no longer re-decode every image — deleting a card is now
  0 re-decodes (was N) and the preview no longer "reloads from scratch"/flashes. Cache is
  rebuilt from the current page each draw (bounded memory; removed images dropped). Page
  navigation still decodes the newly-shown page once.
- **Crop-mark fix:** crop marks no longer overflow into adjacent cards at small bleed.
  New pure `cropMarkSpan(limit, gap, len)` in `pdfGenerator.js` clamps each mark's outward
  reach to the available space — inner edges to `bleed` (the midline between ganged cards),
  outer edges to `bleed + offset` (page margin, also prevents off-page marks); `bleed = 0`
  → no inner marks. Shared by the PDF (`drawCropMarks`) and the canvas preview
  (`drawCropMarksCanvas`).
- **Interactive preview redesign:** one large centered page (replaces the 4-up small
  grid), pagination moved to a bottom-center `‹ n/N ›` pager (step 1), green **+**
  add-photos button + full-area drag&drop. Per-card delete: hover a card → red border +
  corner × removes that image. Removed the bottom filename list; **Elimina tutte** is now
  in the sidebar Esporta section. Sidebar Layout keeps only the info box (mini-preview
  dropped). `ImageUploader` deleted (dropzone moved into `App`); added `IconPlus`.
- **Bug/perf fixes:** restored JPEG quality 0.85 in `pdfGenerator` (was 0.97, defeated
  compression); removed `setState`-in-effect in `PagePreview` (offset derived in render);
  memoized grid info + page images; cancel stale async canvas draws; revoke object URLs on
  unmount; deleted unused `VirtualThumbGrid`.
- Earlier: full design pass — contrast/empty-state/responsive/focus fixes, custom SVG icons
  + branded favicon, depth/light-table, Bricolage+Hanken type, code-split PDF libs
  (jspdf/html2canvas lazy), warm-gold rebrand + grain.

All verified live + `npm run lint` clean + `npm run build` green.

## Known issues / TODO

- **`public/vite.svg`** is dead (favicon switched to `favicon.svg`). Safe to delete.
- **A11y:** sidebar `<select>`s are labeled by `<h2>` section titles, not `<label for>` /
  `aria-label`. Functional but could be improved.
- **Touch:** the per-card delete × reveals on hover, so it's not reachable on touch
  devices (no tap-to-reveal). Fine for the desktop print workflow; revisit if mobile
  matters.
- **No tests.**

## Conventions

- Commit + push to `main` after every change unless told to wait (user pref, 2026-06-19).
  Repo is solo, history is direct-to-`main`. Write the commit message to a temp file and use
  `git commit -F <tmpfile>` — PowerShell mangles multi-line `-m` here-strings.
- After UI edits: run the app, screenshot empty + populated, then `npm run build`.
- Treat "AI-default" looks (Inter, generic purple, emoji icons) as signals to diverge.
