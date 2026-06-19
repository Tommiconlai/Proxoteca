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
function calcGrid(pw, ph, bleedMm) {
  const cellW = CARD_W + bleedMm * 2;
  const cellH = CARD_H + bleedMm * 2;
  const cols = Math.floor((pw - PAGE_MARGIN * 2) / cellW);
  const rows = Math.floor((ph - PAGE_MARGIN * 2) / cellH);
  return { cols: Math.max(0, cols), rows: Math.max(0, rows) };
}

/**
 * Restituisce info complete sulla griglia, scegliendo automaticamente
 * l'orientamento che permette più immagini per pagina.
 */
export function getGridInfo(formatKey, bleedMm) {
  const [fw, fh] = PAPER_FORMATS[formatKey];
  const cellW = CARD_W + bleedMm * 2;
  const cellH = CARD_H + bleedMm * 2;

  const portrait = calcGrid(fw, fh, bleedMm);
  const landscape = calcGrid(fh, fw, bleedMm);

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
 * Disegna le linee di taglio (crop marks) per un'immagine nel PDF.
 */
function drawCropMarks(doc, x, y, bleed) {
  const markLength = 3;
  const gap = 0.5;

  const cx = x + bleed;
  const cy = y + bleed;
  const cw = CARD_W;
  const ch = CARD_H;

  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.15);

  // Top-left
  doc.line(cx - gap - markLength, cy, cx - gap, cy);
  doc.line(cx, cy - gap - markLength, cx, cy - gap);
  // Top-right
  doc.line(cx + cw + gap, cy, cx + cw + gap + markLength, cy);
  doc.line(cx + cw, cy - gap - markLength, cx + cw, cy - gap);
  // Bottom-left
  doc.line(cx - gap - markLength, cy + ch, cx - gap, cy + ch);
  doc.line(cx, cy + ch + gap, cx, cy + ch + gap + markLength);
  // Bottom-right
  doc.line(cx + cw + gap, cy + ch, cx + cw + gap + markLength, cy + ch);
  doc.line(cx + cw, cy + ch + gap, cx + cw, cy + ch + gap + markLength);
}

const MM_TO_PX = (dpi) => dpi / 25.4;

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
 * Questo è il cuore dell'ottimizzazione: invece di passare il file raw a jsPDF
 * (che lo tiene in memoria come stringa base64 intera), lo ridimensioniamo
 * alle dimensioni esatte della cella PDF e lo comprimiamo in JPEG 0.85.
 * Riduzione tipica: 5–10× per immagine.
 */
function compressImage(img, cellWmm, cellHmm, dpi, quality = 0.85) {
  const mmToPx = MM_TO_PX(dpi);
  const w = Math.round(cellWmm * mmToPx);
  const h = Math.round(cellHmm * mmToPx);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  // Copre tutta la cella mantenendo le proporzioni (object-fit: cover)
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = img.naturalWidth * scale;
  const sh = img.naturalHeight * scale;
  const sx = (w - sw) / 2;
  const sy = (h - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Genera e scarica il PDF.
 */
export async function generatePDF(files, formatKey, bleedMm, dpi = 600) {
  if (!files || files.length === 0) throw new Error('Nessuna immagine selezionata.');

  const { cols, rows, cellW, cellH, pageW, pageH, orientation, offsetX, offsetY } = getGridInfo(formatKey, bleedMm);

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

  while (imgIndex < files.length) {
    if (imgIndex > 0) doc.addPage([pageW, pageH], orientation);

    let posOnPage = 0;

    while (posOnPage < perPage && imgIndex < files.length) {
      const col = posOnPage % cols;
      const row = Math.floor(posOnPage / cols);
      const x = offsetX + col * cellW;
      const y = offsetY + row * cellH;

      // Carica, ridimensiona e comprimi prima di passare a jsPDF
      const imgEl = await loadImageElement(files[imgIndex]);
      const jpeg = compressImage(imgEl, cellW, cellH, dpi);
      doc.addImage(jpeg, 'JPEG', x, y, cellW, cellH);
      drawCropMarks(doc, x, y, bleedMm);

      posOnPage++;
      imgIndex++;
    }
  }

  const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  doc.save(`proxies_${formatKey}_${ts}.pdf`);
}

