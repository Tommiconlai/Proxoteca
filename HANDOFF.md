# HANDOFF — Proxoteca

Context for the next Claude Code session.

## What it is

Vite + React single-page tool. Load images (card faces) → lay them out on a print
sheet (A3/A4/A5/Letter/Legal) with bleed + crop marks → export a print-ready PDF.
UI is in English (visible strings; **code comments stay Italian**). "Proxies" =
trading-card proxies; card size is 63×88 mm.

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

**Deploy:** GitHub Pages via Actions (`.github/workflows/deploy.yml`: `npm ci` + build →
`deploy-pages`). Repo Settings → Pages → Source must be **"GitHub Actions"** (not branch).
`vite.config.js` sets `base: './'` so assets resolve under the `/Impagina-Proxy/` subpath —
keep it relative (don't hardcode the repo name). Live at
`https://tommiconlai.github.io/Impagina-Proxy/`.

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
| `src/App.jsx` | Root: state (images, format incl. `custom`, sheetUnit/sheetW/sheetH, bleed, bleedStyle, dpi, cardType/cardW/cardH, cropMarks/cropStyle, import + art-picker modals), derives `customSheet` (mm) for custom sheets, header (logo + `?` **help tooltip** — pure-CSS `.help` hover/focus popover with the 4-step how-to, replaced the old tagline) / sidebar / main layout, `react-dropzone` (full-area drag&drop + `open()`). Settings persisted to `localStorage` (`ip:format`/`ip:bleed`/`ip:bleedStyle`/`ip:dpi`/`ip:cardType`/`ip:cardW`/`ip:cardH`/`ip:cropMarks`/`ip:cropStyle`/`ip:sheetUnit`/`ip:sheetW`/`ip:sheetH`; `ip:cardlist` lives in the import modal). Image items carry a `bleedMode` (`none`/`stretch`/`mirror`). Handlers: add / remove / clearAll / toggleBleed (none↔stretch) / duplicate / replaceArt (updates edition) / saveProject (Scryfall cards → `.txt`). Scryfall image items carry `{name,set,collector,primary}` for the save; manual uploads don't (→ excluded). Sidebar = scrolling `.sidebar-scroll` (PageSettings) + fixed `.sidebar-export` footer (flex column): **Add cards** (`.btn-add`, green, opens the upload/Scryfall `.add-menu`) → **Generate PDF** → row [**Save list** · **Delete all**]. Save/Delete are always rendered, `disabled` when `images.length === 0` (Save list hovers green, Delete hovers red). The `addMenuOpen` state + click-outside live here (moved out of the preview footer) |
| `src/components/PageSettings.jsx` | Sidebar settings in **2 group cards**: "Foglio & carta" (format presets + custom sheet W×H with mm/inch toggle · card type presets + custom W×H · bleed) and "Stampa" (bleed-style auto/mirror/stretch/black · dpi · crop marks: show checkbox + style Linee/Squadrette) + "Riepilogo" info box. Above the dpi field, a **low-res warning** (`.lowres-warn`, prop `lowResCount`) appears only when ≥1 placed card is below the chosen DPI — explains the red `!` preview marker. `SelectField` helper = label + `aria-label`ed select |
| `src/components/PagePreview.jsx` | Preview: one large centered page (`PageCanvas`) + per-card hover overlay (click = change art; buttons: duplicate, bleed on/off, delete). `PageCanvas` draws cards + bleed + crop marks + a **low-res warning** triangle (source < ½ the px the chosen DPI needs). Footer: pager + count (the add "+" menu moved to the sidebar export footer) |
| `src/components/ScryfallImportModal.jsx` | Modal: paste a card list **or a deck link** (URL field + "Carica" → `fetchDeckList` fills the textarea) → fetch from Scryfall → add to images. Pasted text persisted to `localStorage` (`ip:cardlist`). Accepts `(SET) collector` to pin a printing |
| `src/components/ArtPickerModal.jsx` | Click a placed card → lists all Scryfall printings (`fetchPrints`, `/cards/search?unique=prints`) → pick one → `downloadAsFile` swaps `file`+`preview` (id/bleedMode kept). Card name is derived from the **filename**; `fetchPrints` picks the printing face whose name matches it, so DFC backs get back-face prints |
| `src/hooks/useIsMobile.js` | `matchMedia('(max-width: 768px)')` via `useSyncExternalStore` → boolean. App renders the desktop tree above 768px, `MobileLayout` at/below |
| `src/components/MobileLayout.jsx` | Mobile shell (≤768px): compact header (Logo + `?` tap-tooltip), three bottom tabs via `BottomTabBar` — **Cards** (`PageCanvas` preview + ＋ FAB → add bottom-sheet; `onCardTap` → `CardActionSheet`), **Settings** (reuses `PageSettings`), **Export** (count/missing + low-res warn + Generate/Save/Delete). Presentational only; consumes `settingsProps`/`previewProps`/`actions`/`addMenu` bundles from `App`. Local state: tab, addOpen, sel, helpOpen |
| `src/components/BottomTabBar.jsx` | 3-tab nav (Cards/Settings/Export); reuses `IconLayout`/`IconFile` + an inline sliders icon |
| `src/components/CardActionSheet.jsx` | Mobile bottom sheet for a tapped card: Change art · Duplicate · Bleed on/off · Remove (wired to the App handlers) |
| `src/utils/pdfGenerator.js` | Grid math (`getGridInfo(formatKey, bleedMm, cardW=63, cardH=88, customSheet=null)`; `formatKey==='custom'` uses `customSheet` mm dims, else `PAPER_FORMATS`) + `generatePDF(items, formatKey, bleedMm, dpi, bleedStyle, cardW, cardH, cropMarks, cropStyle, customSheet)` (jspdf, dynamically imported) + `drawCardWithBleed` (stretch/mirror/black bleed) + `resolveBleedMode` (per-card mode × global style) + `drawCropMarks(…, style)` (`lines`/`corners`) + `cropMarkSpan` (clamped crop marks) |
| `src/utils/scryfall.js` | `parseCardList` (text → `{qty,name,set,collector}`; collector keeps **original case** — Scryfall `/cards/collection` is case-sensitive on it, e.g. The List `TMP-294`) + `fetchScryfallImages` (`/cards/collection` batched, printing-pinned via name\|set\|collector keys, downloads PNGs as `File`; DFC → both faces) + `fetchPrints` + `downloadAsFile` + `fetchDeckList` (deck link → text, via `corsproxy.io`) + `deckLine(qty,name,set,cn)` (builds `qty Name (SET) cn` so deck links pin the **edition chosen in the deck**) + `buildDeckList(items)` (placed cards → deck-list text for "Save list"; front faces only, custom uploads excluded) |
| `src/utils/scryfall.selfcheck.js` | `node`-runnable assert check for `parseCardList` (no framework). Run: `node src/utils/scryfall.selfcheck.js` |
| `src/components/icons.jsx` | Custom lucide-style SVG icon set (currentColor), incl. `IconPlus`, `IconDownload`, `IconCopy`, `IconFrame` + `Logo` (Proxoteca brandmark: gold-gradient circle + white burst, inline; same art as `public/favicon.svg`, used in the header) |
| `src/index.css` | All styling + design tokens |
| `public/` (favicons) | Proxoteca icon set: `favicon.svg/.ico`, `favicon-16/32/48/192/512.png`, `apple-touch-icon.png`, `site.webmanifest`. Linked in `index.html` with root-absolute paths → Vite rewrites to `./` via `base:'./'` (Pages-safe); manifest icon `src`s are relative. **`favicon.svg` is the gold-circle + white-burst mark** (matches the header). ⚠️ The **raster PNG/ico/apple-touch are still the old dark-`#16181D`-square** version — no local rasterizer (sharp won't install); re-export from the design tool to match. |

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
- **Add-cards button** (`.btn-add`, sidebar) is green `#2ecc71` — a deliberate add/create
  affordance, intentionally distinct from the gold accent and the red delete/warning color.
  Don't recolor it to gold. **Save list** (`.btn-save`) also hovers green (save/create); **Delete
  all** and per-card delete use `--danger` (red).

## Done recently

- **Bigger change-art thumbnails on touch (most recent):** the mobile `.art-grid` track
  (base `minmax(84px,1fr)`) is now **126px on phones (+50%)** and **210px on portrait tablets
  (+150%)**. Phone value lives in the shared full-screen-modal `@media`; a dedicated
  `@media (min-width:769px) and (max-width:1024px) and (orientation:portrait)` overrides the
  track for tablets. (`1fr` still stretches each track to fill, so rendered cells are a bit
  larger than the min.) Desktop stays the fixed 168px. Verified live: 375px → 158px cells/2 cols,
  820px → 249px cells/3 cols.
- **Mobile layout on portrait tablets:** `MobileLayout` now also renders on
  **tablets held vertically**, not just phones. `useIsMobile` QUERY went from `(max-width:768px)`
  to `(max-width:768px), (max-width:1024px) and (orientation:portrait)`; the `index.css`
  full-screen-modal `@media` was changed to the **same** condition (keep the two in sync). Tablet
  *landscape* and laptops stay desktop (the portrait clause excludes them). Verified live: 820px &
  1024px portrait → bottom-tab shell + full-screen modal; 1180×820 landscape → desktop sidebar.
- **Change-art modal sizing:** the box was `.modal` `max-width:520px` —
  a small, resolution-dependent fraction on wider/hi-dpi monitors. New `.modal-art`
  modifier (in `ArtPickerModal`) sets a **fixed `width:820px` (`max-width:94vw` guard)**
  so it's the same CSS size on every desktop resolution and ~58% bigger. `.art-grid`
  desktop cells went from `minmax(110px,1fr)` to a **fixed `168px`** (gap 12, `max-height:64vh`)
  so thumbnails are larger and the grid fills the wider box. The mobile `@media(max-width:768px)`
  `.modal` reset gained `width:100%;min-width:0` so the full-screen mobile modal is unaffected.
  (`fit-content` was tried first but `auto-fill` collapses to one column under intrinsic
  sizing.) Verified live: 820px at 1481px & 1920px viewports (identical), mobile 375px full-screen
  no overflow; lint + build green.
- **Mobile UX — bottom-tab shell:** at `≤768px` (`useIsMobile`), `App` renders
  `MobileLayout` instead of the desktop sidebar/preview; all state + handlers stay in `App` and
  flow through `settingsProps`/`previewProps`/`actions`/`addMenu` bundles (shared by both layouts,
  DRY). Three bottom tabs: **Cards** (`PageCanvas` preview + ＋ FAB → add bottom-sheet; tap a card
  → `CardActionSheet` with change-art/duplicate/bleed/remove), **Settings** (reuses `PageSettings`),
  **Export** (count/missing + low-res warn + Generate/Save/Delete). `PagePreview` gained an
  `onCardTap` prop: in tap mode it hides the hover buttons and a tap calls `onCardTap`; **desktop
  (no `onCardTap`) is byte-identical**. Modals go full-screen ≤768px; the `?` help toggles on tap
  (desktop stays hover). Spec + plan in `docs/superpowers/`; verified live at 375px + desktop
  regression at 927px; lint + build + selfcheck green.
- **Save project / deck list:** sidebar "Save list" button → downloads a `.txt`
  deck list (`qty Name (SET) cn`) of the placed **Scryfall** cards. It's the *same* format the
  Scryfall import reads, so reloading a project = paste the `.txt` back into "Import from Scryfall"
  (no separate load path built). Import now attaches `{name, set, collector, primary}` to each
  image item (was dropped after import); `primary` marks the front face so DFCs aren't double-
  counted. `buildDeckList(items)` (in `utils/scryfall.js`) groups front faces → `deckLine`, and
  returns `{text, cards, custom}`. **Custom uploads can't be saved to text** (no metadata): they're
  counted and excluded with a neutral notice, not blocked. Change-art updates the item's
  set/collector (`fetchPrints` now also returns `collector`) so the save follows the chosen
  printing. Verified live (2× pinned + 1 DFC → `2 Sol Ring (C21) 263` / `1 Fable of the Mirror-
  Breaker`, DFC counted once); self-check covers grouping + round-trip.
- **Mirror-bleed seam fix:** some full-art cards (bright edges) showed a thin dark line at
  the card↔bleed join in `mirror`. Cause: the Scryfall PNG's outermost 1-3 px are a darker
  antialias **fringe**. `drawCardWithBleed` now (a) draws the card from an `inset` (`≈iw/370`,
  ~2 px) so the trim edge samples real art, not the fringe, and (b) samples every mirror/stretch
  band from the same inset so the join pixel matches — plus the earlier `ov = 1` px inward
  overlap to hide the AA hairline. Measured on the real SLD Exotic Orchard PNG: seam dip went
  ~35% → ~5% (gone); dark-edged cards (SPG Verdant Catacombs) stay flat. `black` mode only gets
  the cleaner inset trim edge.
- **UI translated to English:** all visible strings (sidebar, preview, both modals, errors,
  `index.html`); code comments stay Italian. Verified live.
- **Deck-link import pins the deck's edition:** `moxfieldList`/`archidektList`
  emitted only `qty Name`, so Scryfall returned the *default* printing — not the one chosen in
  the deck. They now emit `qty Name (SET) cn` via a shared `deckLine` helper (Moxfield card →
  `set`/`cn`; Archidekt → `edition.editioncode`/`collectorNumber`), and the existing
  `(SET) collector` pin pipeline does the rest. **Fixed a latent bug it exposed:** `parseCardList`
  lowercased the collector, but `/cards/collection` is **case-sensitive** on it — alphanumeric
  collectors (The List `TMP-294`, `PCY-45`) returned not-found. Collector now keeps original case;
  Map keys stay case-insensitive. Verified live on the test deck: 100/100 cards resolve to the
  exact edition, 0 not-found (was 2). Self-check + `deckLine` round-trip added. Tappedout left as-is
  (`?fmt=txt` already passes any `(SET)` tail through; untested).
- **DFC back-face change-art fix:** `fetchPrints` extracted `card_faces[0]`
  (front) for every printing, so changing a back face's art showed/applied the front. It now
  picks the face whose `name` matches the searched name (the back filename → back face). The
  search already matches by face name, so no import-chain change was needed. Verified live
  (Harnfel back → back-face prints).
- **DFC name fix:** deck lists give double-faced cards as `Front // Back`, but
  Scryfall `/cards/collection` only matches the **front** face name (the full `A // B` returns
  not-found). `parseCardList` now keeps the part before `//`; `imageFaces` still emits both
  faces. Fixes the "non trovate" on transform/MDFC cards (also safe for split cards, whose
  front name matches too). Verified live (Birgi, Ral → 4 faces, 0 missing).
- **Import deck list from a link:** the Scryfall modal got a URL field +
  "Carica". `fetchDeckList(url)` (in `utils/scryfall.js`) detects the site, fetches the
  decklist, and fills the textarea as `qty Name` lines → the existing parse/import pipeline
  takes over. Sites: **Moxfield / Archidekt / Tappedout**. These send no CORS headers and the
  app is static, so requests go through a **public CORS proxy** (`corsproxy.io`); only the
  proxy URL constant needs changing if it dies. **Archidekt and Moxfield verified live
  end-to-end** (real decks); Tappedout uses its documented `?fmt=txt` shape (proxy forwarding
  confirmed, not tested with a real deck). Manabox was left out — its API is CORS-OK but the web
  URL/JSON shape couldn't be verified.
- **Animated "Mostra crocini" checkbox:** native input hidden-but-focusable +
  an SVG (`.anim-check`) that morphs a circle into a checkmark on `:checked` (adapted Uiverse
  snippet — green swapped for the gold `--accent`, light ripple/base for the dark theme).
- **Sidebar redesign (from a design critique):**
  - *Fixed export footer:* `.app` is now `height: 100dvh` (was `min-height`), so the sidebar
    splits into a scrolling `.sidebar-scroll` (the settings) + a non-scrolling `.sidebar-export`
    footer. **Genera PDF is always visible** — before it sat below the fold. (Sticky-bottom was
    tried first but the trailing content peeked under it; a flex footer is clean.)
  - *Grouped controls:* the 6 separate carded sections collapsed into **2 group cards**
    ("Foglio & carta", "Stampa") of stacked `.field`s + a trimmed "Riepilogo" box — far less
    scroll. `SelectField` helper renders label + select.
  - *Contrast:* section `h2` lightened `--text-muted` → `--text-secondary` (was ~4.4:1 at 11px,
    failed AA; now ~5.9:1).
  - *A11y:* every `<select>` got an `aria-label` (no more reliance on the `<h2>` as the only name).
  - Info box no longer duplicates DPI; renamed "Layout" → "Riepilogo". Verified live (default fits
    without scroll; custom sheet scrolls with the footer pinned).
- **Crop-mark style + checkbox + custom sheet:**
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
  cell). **`bleedMode: 'none'` draws the card at trim (63×88), bleed margin left blank** —
  toggling bleed off no longer resizes the card up to the full cell (preview + PDF; was
  fill-cell/cover before). (mpc-autofill itself is desktop MPC-order automation, not embeddable;
  this replicates the print-ready bleed in-browser.)
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

- **Deck-link import depends on `corsproxy.io`** (a free public CORS proxy) for Moxfield /
  Archidekt / Tappedout. If it rate-limits or dies, swap `CORS_PROXY` in `utils/scryfall.js`
  or add a tiny backend. The Tappedout parser uses a documented `?fmt=txt` shape but wasn't
  tested with a real deck — fix the field path if an import comes back empty.
- **A11y:** sidebar `<select>`s now carry `aria-label`s (field text is a decorative `<span>`);
  custom W/H inputs are wrapped in `<label>`. Remaining gap: no full keyboard/focus-visible audit.
- **Touch (desktop layout):** the per-card hover buttons reveal on hover, so they're not
  reachable on touch in the *desktop* layout. Resolved on the mobile layout (≤768px) — there
  `PagePreview` runs in tap mode (`onCardTap`) and a tap opens `CardActionSheet`. A touch device
  on a wide screen still gets the desktop hover buttons.
- **Low-res warning:** the per-card `!` is canvas-drawn (visual-only, no SR text), but the
  sidebar now has a DOM `.lowres-warn` above the dpi field explaining it (counts cards whose
  decoded `naturalWidth` < `dpi*0.5*cardW/25.4` — same threshold as the marker; dims are decoded
  once on add and stored as `item.w`). `replaceArt` doesn't re-decode `w` (Scryfall prints are all
  745×1040, so it stays valid).
- **Tests:** only `scryfall.selfcheck.js` (parseCardList). No component/integration tests.

## Conventions

- Commit + push to `main` after every change unless told to wait (user pref, 2026-06-19).
  Repo is solo, history is direct-to-`main`. Write the commit message to a temp file and use
  `git commit -F <tmpfile>` — PowerShell mangles multi-line `-m` here-strings.
- After UI edits: run the app, screenshot empty + populated, then `npm run build`.
- Treat "AI-default" looks (Inter, generic purple, emoji icons) as signals to diverge.
