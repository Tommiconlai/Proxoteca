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
| `src/App.jsx` | Root: state (images, format incl. `custom`, sheetUnit/sheetW/sheetH, bleed, bleedStyle, dpi, cardType/cardW/cardH, cropMarks/cropStyle, import + art-picker modals), derives `customSheet` (mm) for custom sheets, header/sidebar/main layout, `react-dropzone` (full-area drag&drop + `open()`). Settings persisted to `localStorage` (`ip:format`/`ip:bleed`/`ip:bleedStyle`/`ip:dpi`/`ip:cardType`/`ip:cardW`/`ip:cardH`/`ip:cropMarks`/`ip:cropStyle`/`ip:sheetUnit`/`ip:sheetW`/`ip:sheetH`; `ip:cardlist` lives in the import modal). Image items carry a `bleedMode` (`none`/`stretch`/`mirror`). Handlers: add / remove / clearAll / toggleBleed (none↔stretch) / duplicate / replaceArt |
| `src/components/PageSettings.jsx` | Sidebar: format (presets + **custom sheet** W×H with mm/inch toggle) / **card type** (presets + custom W×H) / bleed / **bleed-style** (auto/mirror/stretch/black) / dpi / **crop marks** (show checkbox + style: Linee / Squadrette) + layout info box (Foglio / Carta / Cella / griglia / immagini per pagina) |
| `src/components/PagePreview.jsx` | Preview: one large centered page (`PageCanvas`) + per-card hover overlay (click = change art; buttons: duplicate, bleed on/off, delete). `PageCanvas` draws cards + bleed + crop marks + a **low-res warning** triangle (source < ½ the px the chosen DPI needs). Footer: pager + count + green "+" menu (carica file / importa Scryfall) |
| `src/components/ScryfallImportModal.jsx` | Modal: paste a card list → fetch from Scryfall → add to images. Pasted text persisted to `localStorage` (`ip:cardlist`). Accepts `(SET) collector` to pin a printing |
| `src/components/ArtPickerModal.jsx` | Click a placed card → lists all Scryfall printings (`fetchPrints`, `/cards/search?unique=prints`) → pick one → `downloadAsFile` swaps `file`+`preview` (id/bleedMode kept). Card name is derived from the **filename** (DFC / special chars → no prints) |
| `src/utils/pdfGenerator.js` | Grid math (`getGridInfo(formatKey, bleedMm, cardW=63, cardH=88, customSheet=null)`; `formatKey==='custom'` uses `customSheet` mm dims, else `PAPER_FORMATS`) + `generatePDF(items, formatKey, bleedMm, dpi, bleedStyle, cardW, cardH, cropMarks, cropStyle, customSheet)` (jspdf, dynamically imported) + `drawCardWithBleed` (stretch/mirror/black bleed) + `resolveBleedMode` (per-card mode × global style) + `drawCropMarks(…, style)` (`lines`/`corners`) + `cropMarkSpan` (clamped crop marks) |
| `src/utils/scryfall.js` | `parseCardList` (text → `{qty,name,set,collector}`) + `fetchScryfallImages` (`/cards/collection` batched, printing-pinned via name\|set\|collector keys, downloads PNGs as `File`; DFC → both faces) + `fetchPrints` + `downloadAsFile` |
| `src/utils/scryfall.selfcheck.js` | `node`-runnable assert check for `parseCardList` (no framework). Run: `node src/utils/scryfall.selfcheck.js` |
| `src/components/icons.jsx` | Custom lucide-style SVG icon set (currentColor), incl. `IconPlus`, `IconDownload`, `IconCopy`, `IconFrame` |
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

- **Crop-mark style + checkbox + custom sheet (most recent):**
  - *Crop-mark styles:* `cropStyle` = `'lines'` (the original edge-aligned marks, clamped by
    `cropMarkSpan`) | `'corners'` (squadrette — L-brackets offset into the gutter at each trim
    corner, opening toward the card). `drawCropMarks` (PDF) + `drawCropMarksCanvas` (preview)
    both take a `style` arg.
  - *Show-crop is now a checkbox* (`.checkbox-row`, `accent-color` gold) instead of a select;
    the style select shows only when checked.
  - *Custom sheet:* "Personalizzato" option in the format select reveals W×H inputs + an
    **mm / inch** toggle (`.unit-toggle`). `sheetW`/`sheetH` are stored in the chosen unit;
    `App` derives `customSheet` in mm and threads it through `getGridInfo(…, customSheet)` and
    `generatePDF(…, customSheet)`. Toggling units converts the shown values. Persisted. Verified live.
- **Card type + crop-mark toggle:**
  - *Tipo carta:* sidebar preset select (Standard 63×88, Piccola/JP 59×86, Mini USA 41×63,
    Tarot 70×120) + "Personalizzata" with free W×H inputs. `CARD_W`/`CARD_H` are now just
    defaults — `getGridInfo(formatKey, bleedMm, cardW, cardH)` and `generatePDF(…, cardW, cardH, …)`
    take real dims, threaded through `App` state (`cardType`/`cardW`/`cardH`, persisted) into
    `PageSettings`, `PagePreview`/`PageCanvas`, crop marks, and the low-res check.
  - *Crocini di taglio:* Mostra/Nascondi select gates crop marks in both the PDF
    (`generatePDF` `cropMarks` arg) and the canvas preview (`PageCanvas` `showCrop`).
  - Layout info box relabelled: Foglio (sheet) / Carta (card) / Cella (cell). Verified live.
- **Five usability features:**
  - *Persistence:* settings (`formatKey`/`bleedMm`/`bleedStyle`/`dpi`) + the pasted
    Scryfall list survive reload via `localStorage`. Images (blobs) are not persisted —
    re-import is one click. Corrupt `ip:format` falls back to A3 (guards a crash in `getGridInfo`).
  - *Bleed on manual uploads:* per-card hover button toggles `bleedMode` none↔stretch.
    Before this, uploads were locked to object-fit cover and the bleed feature never touched
    them. Cards with bleed show a persistent gold frame indicator. Global "Stile abbondanza"
    can still force mirror/black on top.
  - *Duplicate card:* hover button inserts a copy right after the original (fresh object URL).
  - *Pin printing at import:* `parseCardList` now captures the `(SET) collector` tail instead of
    stripping it; `/cards/collection` uses the most precise identifier (set+collector → name+set →
    name). Resolved cards are registered under `name|set|collector` keys so mixed pinned/unpinned
    lists match back without collisions.
  - *Low-res warning:* `PageCanvas` draws a red "!" triangle on a card whose source image can't
    supply half the px the chosen DPI needs (Scryfall PNGs ≈300 DPI → clean up to 600 DPI).
  - Self-check for the parser in `scryfall.selfcheck.js`. Verified live; build + lint green.
- **Change-art picker:** click a placed card → `ArtPickerModal` lists every Scryfall printing
  (`/cards/search?unique=prints`) → pick one → swaps the image in place (keeps id/bleedMode).
  Name is read from the card's filename, so renamed/DFC files may find no prints.
- **Bleed generation for Scryfall imports:** Scryfall cards arrive at trim size (no bleed).
  Items carry a `bleedMode` (`'stretch'` | `'mirror'` for Scryfall, `'none'` for manual
  uploads). `pdfGenerator.drawCardWithBleed` draws the card 1:1 in the trim area and fills
  the bleed margin: `stretch` extends the outermost row/column (corners replicated, ideal
  for black-bordered cards), `mirror` reflects the outer band (better for full-art). The
  Scryfall import auto-picks `mirror` when the resolved card is `full_art` / `border_color:
  borderless`, else `stretch` (note: `/cards/collection` returns the default printing, so
  mirror only fires when that printing is itself full-art/borderless). Shared by the canvas
  preview and `compressImage`/PDF, follows the bleed slider (`bleed=0` → card fills the
  cell). Manual uploads keep object-fit cover. (mpc-autofill itself is desktop MPC-order
  automation, not embeddable; this replicates the print-ready bleed in-browser.)
- **Scryfall import:** the green "+" is now a menu — "Carica file" (existing picker) or
  "Importa da Scryfall". The Scryfall option opens a modal (`ScryfallImportModal`) where you
  paste a `1x Card Name` list; `utils/scryfall.js` resolves names via `/cards/collection`
  (batched 75), downloads the PNGs as `File`s, and feeds them through the normal pipeline.
  Double-faced cards import both faces; missing names are listed. Images arrive as blob
  object URLs (same-origin) so the canvas/PDF export is not tainted. After a successful
  import the modal's "Importa" button becomes "Finito" (closes). Verified live.
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
- **Touch:** the per-card hover buttons (change-art / duplicate / bleed / delete) reveal on
  hover, so they're not reachable on touch devices (no tap-to-reveal). Fine for the desktop
  print workflow; revisit if mobile matters.
- **Low-res warning is canvas-drawn** (not a DOM badge), so it's visual-only — no screen-reader
  text. Acceptable for a print-quality hint; tied to the same a11y gap above.
- **Tests:** only `scryfall.selfcheck.js` (parseCardList). No component/integration tests.

## Conventions

- Commit + push to `main` after every change unless told to wait (user pref, 2026-06-19).
  Repo is solo, history is direct-to-`main`. Write the commit message to a temp file and use
  `git commit -F <tmpfile>` — PowerShell mangles multi-line `-m` here-strings.
- After UI edits: run the app, screenshot empty + populated, then `npm run build`.
- Treat "AI-default" looks (Inter, generic purple, emoji icons) as signals to diverge.
