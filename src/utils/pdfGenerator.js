/**
 * PDF Generator Utility — ImpaginaProxies
 *
 * Costanti: tutte le misure in mm, jsPDF usa 'mm' come unità.
 * Orientamento: auto-calcolato per massimizzare il numero di immagini.
 */

export const CARD_W = 63;   // mm
export const CARD_H = 88;   // mm
export const PAGE_MARGIN = 4; // mm

export const PAPER_FORMATS = {
  'A4': [210, 297],
  'A3': [297, 420],
  'A5': [148, 210],
  'Letter': [216, 279],
  'Legal': [216, 356],
};

/**
 * Calcola griglia per una combinazione larghezza/altezza pagina.
 */
function calcGrid(pw, ph, bleedMm, cardW, cardH) {
  const cellW = cardW + bleedMm * 2;
  const cellH = cardH + bleedMm * 2;
  const cols = Math.floor((pw - PAGE_MARGIN * 2) / cellW);
  const rows = Math.floor((ph - PAGE_MARGIN * 2) / cellH);
  return { cols: Math.max(0, cols), rows: Math.max(0, rows) };
}

/**
 * Restituisce info complete sulla griglia, scegliendo automaticamente
 * l'orientamento che permette più immagini per pagina.
 * cardW/cardH: dimensioni carta in mm (default carta da gioco standard 63×88).
 */
export function getGridInfo(formatKey, bleedMm, cardW = CARD_W, cardH = CARD_H, customSheet = null) {
  const [fw, fh] = formatKey === 'custom' && customSheet ? customSheet : (PAPER_FORMATS[formatKey] || PAPER_FORMATS.A4);
  const cellW = cardW + bleedMm * 2;
  const cellH = cardH + bleedMm * 2;

  const portrait = calcGrid(fw, fh, bleedMm, cardW, cardH);
  const landscape = calcGrid(fh, fw, bleedMm, cardW, cardH);

  const useLandscape = (landscape.cols * landscape.rows) > (portrait.cols * portrait.rows);

  const pageW = useLandscape ? fh : fw;
  const pageH = useLandscape ? fw : fh;
  const { cols, rows } = useLandscape ? landscape : portrait;

  const offsetX = (pageW - cols * cellW) / 2;
  const offsetY = (pageH - rows * cellH) / 2;

  return {
    cols,
    rows,
    perPage: cols * rows,
    cellW,
    cellH,
    pageW,
    pageH,
    offsetX,
    offsetY,
    orientation: useLandscape ? 'landscape' : 'portrait',
  };
}

/**
 * Estensione (distanze [a, b] dal bordo trim) di un crocino che punta verso
 * l'esterno, limitata a `limit` perché non superi la mezzeria tra due carte
 * adiacenti (limit = bleed) o il bordo pagina (limit = bleed + offset).
 *
 * Risolve l'ambiguità con bleed piccolo: con lunghezza fissa il crocino di una
 * carta sconfinava oltre la mezzeria invadendo la carta vicina.
 *
 * @returns {{a:number,b:number}|null} null se non c'è spazio (es. bleed = 0 sui lati interni)
 */
export function cropMarkSpan(limit, gap, len) {
  if (limit <= 0) return null;
  if (gap + len <= limit) return { a: gap, b: gap + len }; // spazio pieno: crocino intero
  if (limit <= gap) return { a: 0, b: limit };             // spazio < gap: crocino corto dal bordo
  return { a: gap, b: limit };                              // accorcia il crocino fino alla mezzeria
}

/**
 * Disegna le linee di taglio (crop marks) per un'immagine nel PDF.
 * `limits` = estensione massima verso l'esterno per lato (left/right/up/down):
 * `bleed` sui bordi interni (mezzeria con la carta vicina), `bleed + offset`
 * sui bordi esterni (margine pagina).
 */
function drawCropMarks(doc, x, y, bleed, limits, cardW, cardH, style = 'lines') {
  const markLength = 3;
  const gap = 0.5;

  const cx = x + bleed;
  const cy = y + bleed;
  const cw = cardW;
  const ch = cardH;

  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.15);

  if (style === 'corners') {
    // Squadrette ad angolo: vertice spostato in fuori di g (resta nel gutter),
    // due bracci di lunghezza len verso la carta. Inquadrano l'angolo di taglio.
    const g = bleed > 0 ? Math.min(0.6, bleed) : 0.6;
    const len = Math.min(markLength, cw * 0.45, ch * 0.45);
    const bracket = (vx, vy, sx, sy) => {
      doc.line(vx, vy, vx + sx * len, vy);
      doc.line(vx, vy, vx, vy + sy * len);
    };
    bracket(cx - g, cy - g, 1, 1);            // alto-sx
    bracket(cx + cw + g, cy - g, -1, 1);      // alto-dx
    bracket(cx - g, cy + ch + g, 1, -1);      // basso-sx
    bracket(cx + cw + g, cy + ch + g, -1, -1);// basso-dx
    return;
  }

  const L = cropMarkSpan(limits.left, gap, markLength);
  const R = cropMarkSpan(limits.right, gap, markLength);
  const U = cropMarkSpan(limits.up, gap, markLength);
  const D = cropMarkSpan(limits.down, gap, markLength);

  // Orizzontali (escono dai bordi verticali del trim, verso sinistra/destra)
  if (L) {
    doc.line(cx - L.b, cy, cx - L.a, cy);
    doc.line(cx - L.b, cy + ch, cx - L.a, cy + ch);
  }
  if (R) {
    doc.line(cx + cw + R.a, cy, cx + cw + R.b, cy);
    doc.line(cx + cw + R.a, cy + ch, cx + cw + R.b, cy + ch);
  }
  // Verticali (escono dai bordi orizzontali del trim, verso alto/basso)
  if (U) {
    doc.line(cx, cy - U.b, cx, cy - U.a);
    doc.line(cx + cw, cy - U.b, cx + cw, cy - U.a);
  }
  if (D) {
    doc.line(cx, cy + ch + D.a, cx, cy + ch + D.b);
    doc.line(cx + cw, cy + ch + D.a, cx + cw, cy + ch + D.b);
  }
}

// drawImage con flip opzionale orizzontale/verticale (per il mirror del bleed).
function blit(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh, flipX, flipY) {
  ctx.save();
  ctx.translate(flipX ? dx + dw : dx, flipY ? dy + dh : dy);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  ctx.restore();
}

/**
 * Risolve il modo di abbondanza effettivo combinando la modalità per-carta
 * (`itemMode`) con lo stile globale scelto dall'utente (`style`).
 * - style 'auto'        → usa la modalità della carta (Scryfall: mirror/stretch)
 * - style mirror/stretch/black → forza lo stile, ma SOLO sulle carte che hanno
 *   già abbondanza; gli upload manuali ('none') restano cover (no distorsione).
 */
export function resolveBleedMode(itemMode, style) {
  const m = itemMode || 'none';
  if (!style || style === 'auto') return m;
  if (m === 'none') return 'none';
  return style;
}

/**
 * Disegna `img` come carta a misura di taglio (1:1) nell'area centrale della
 * cella e genera l'abbondanza (bleed) attorno. Ricrea i bordi mancanti per il
 * taglio al vivo di immagini senza abbondanza (es. Scryfall).
 * - mode 'stretch' (default): riga/colonna esterna stirata, angoli replicati.
 *   Ideale per carte bordo nero.
 * - mode 'mirror': specchia verso l'esterno la fascia esterna della carta.
 *   Più naturale sulle full-art.
 * - mode 'black': abbondanza nera piena. Per carte bordo-nero quando si vuole
 *   un taglio al vivo pulito senza stirare/specchiare i pixel del bordo.
 * bleedPx = 0 → la carta riempie tutta la cella.
 */
export function drawCardWithBleed(ctx, img, x, y, cellW, cellH, bleedPx, mode = 'stretch') {
  const b = Math.max(0, bleedPx);
  const tx = x + b;
  const ty = y + b;
  const tw = cellW - 2 * b;
  const th = cellH - 2 * b;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (tw <= 0 || th <= 0 || !iw || !ih) return;

  // Carta a misura di taglio (aspect carta ≈ trim → nessuna distorsione visibile)
  ctx.drawImage(img, 0, 0, iw, ih, tx, ty, tw, th);
  if (b <= 0) return;

  if (mode === 'black') {
    // Anello nero attorno al trim (le bande alto/basso coprono anche gli angoli)
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, cellW, b);              // alto (piena larghezza)
    ctx.fillRect(x, y + cellH - b, cellW, b);  // basso (piena larghezza)
    ctx.fillRect(x, ty, b, th);                // sinistra
    ctx.fillRect(x + cellW - b, ty, b, th);    // destra
    return;
  }

  if (mode === 'mirror') {
    // Larghezza/altezza (in px sorgente) della fascia da specchiare
    const bsw = Math.max(1, Math.min(iw, Math.round((b * iw) / tw)));
    const bsh = Math.max(1, Math.min(ih, Math.round((b * ih) / th)));
    // Bordi
    blit(ctx, img, 0, 0, iw, bsh, tx, ty - b, tw, b, false, true);          // alto
    blit(ctx, img, 0, ih - bsh, iw, bsh, tx, ty + th, tw, b, false, true);  // basso
    blit(ctx, img, 0, 0, bsw, ih, tx - b, ty, b, th, true, false);          // sinistra
    blit(ctx, img, iw - bsw, 0, bsw, ih, tx + tw, ty, b, th, true, false);  // destra
    // Angoli
    blit(ctx, img, 0, 0, bsw, bsh, tx - b, ty - b, b, b, true, true);                  // alto-sx
    blit(ctx, img, iw - bsw, 0, bsw, bsh, tx + tw, ty - b, b, b, true, true);          // alto-dx
    blit(ctx, img, 0, ih - bsh, bsw, bsh, tx - b, ty + th, b, b, true, true);          // basso-sx
    blit(ctx, img, iw - bsw, ih - bsh, bsw, bsh, tx + tw, ty + th, b, b, true, true);  // basso-dx
    return;
  }

  // edge-stretch: riga/colonna esterna stirata nell'abbondanza
  ctx.drawImage(img, 0, 0, iw, 1, tx, ty - b, tw, b);          // alto
  ctx.drawImage(img, 0, ih - 1, iw, 1, tx, ty + th, tw, b);    // basso
  ctx.drawImage(img, 0, 0, 1, ih, tx - b, ty, b, th);          // sinistra
  ctx.drawImage(img, iw - 1, 0, 1, ih, tx + tw, ty, b, th);    // destra
  // Angoli: pixel d'angolo replicato
  ctx.drawImage(img, 0, 0, 1, 1, tx - b, ty - b, b, b);             // alto-sx
  ctx.drawImage(img, iw - 1, 0, 1, 1, tx + tw, ty - b, b, b);       // alto-dx
  ctx.drawImage(img, 0, ih - 1, 1, 1, tx - b, ty + th, b, b);       // basso-sx
  ctx.drawImage(img, iw - 1, ih - 1, 1, 1, tx + tw, ty + th, b, b); // basso-dx
}

/**
 * Carica un File come HTMLImageElement.
 */
function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Impossibile caricare ${file.name}`)); };
    img.src = url;
  });
}

/**
 * Ridimensiona e comprime un'immagine su canvas, restituendo un dataURL JPEG.
 * Ridimensiona alle dimensioni esatte della cella PDF e comprime in JPEG 0.85
 * (riduzione tipica 5–10×). Con `bleedFill` la carta è disegnata a misura di
 * taglio e l'abbondanza è generata con edge-stretch; altrimenti object-fit cover.
 */
function compressImage(img, cellWmm, cellHmm, dpi, bleedMm, bleedMode, quality = 0.85) {
  const mmToPx = dpi / 25.4;
  const w = Math.round(cellWmm * mmToPx);
  const h = Math.round(cellHmm * mmToPx);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (bleedMode && bleedMode !== 'none') {
    // Sfondo nero dietro la carta: i PNG Scryfall hanno angoli arrotondati
    // trasparenti — su bianco lascerebbero tacche bianche negli angoli (trim e
    // abbondanza). Nero = standard di stampa, si fonde coi bordi neri/full-art.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    drawCardWithBleed(ctx, img, 0, 0, w, h, Math.round(bleedMm * mmToPx), bleedMode);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    // object-fit: cover (immagini caricate a mano)
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = img.naturalWidth * scale;
    const sh = img.naturalHeight * scale;
    const sx = (w - sw) / 2;
    const sy = (h - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh);
  }
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Genera e scarica il PDF.
 */
export async function generatePDF(items, formatKey, bleedMm, dpi = 600, bleedStyle = 'auto', cardW = CARD_W, cardH = CARD_H, cropMarks = true, cropStyle = 'lines', customSheet = null) {
  if (!items || items.length === 0) throw new Error('Nessuna immagine selezionata.');

  const { cols, rows, cellW, cellH, pageW, pageH, orientation, offsetX, offsetY } = getGridInfo(formatKey, bleedMm, cardW, cardH, customSheet);

  if (cols === 0 || rows === 0) {
    throw new Error("Il formato carta è troppo piccolo per almeno un'immagine.");
  }

  // jsPDF caricato on-demand: tiene jspdf/html2canvas fuori dal bundle iniziale
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    unit: 'mm',
    format: [pageW, pageH],
    orientation,
    compress: true, // abilita la compressione nel PDF output
  });

  let imgIndex = 0;
  const perPage = cols * rows;

  while (imgIndex < items.length) {
    if (imgIndex > 0) doc.addPage([pageW, pageH], orientation);

    let posOnPage = 0;

    while (posOnPage < perPage && imgIndex < items.length) {
      const col = posOnPage % cols;
      const row = Math.floor(posOnPage / cols);
      const x = offsetX + col * cellW;
      const y = offsetY + row * cellH;

      // Carica, ridimensiona e comprimi prima di passare a jsPDF
      const item = items[imgIndex];
      const imgEl = await loadImageElement(item.file);
      const mode = resolveBleedMode(item.bleedMode, bleedStyle);
      const jpeg = compressImage(imgEl, cellW, cellH, dpi, bleedMm, mode);
      doc.addImage(jpeg, 'JPEG', x, y, cellW, cellH);
      if (cropMarks) {
        const limits = {
          left:  (col === 0 ? offsetX : 0) + bleedMm,
          right: (col === cols - 1 ? offsetX : 0) + bleedMm,
          up:    (row === 0 ? offsetY : 0) + bleedMm,
          down:  (row === rows - 1 ? offsetY : 0) + bleedMm,
        };
        drawCropMarks(doc, x, y, bleedMm, limits, cardW, cardH, cropStyle);
      }

      posOnPage++;
      imgIndex++;
    }
  }

  const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  doc.save(`proxies_${formatKey}_${ts}.pdf`);
}

