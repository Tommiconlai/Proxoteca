import { useRef, useEffect, useState, useCallback } from 'react';
import { getGridInfo, CARD_W, CARD_H } from '../utils/pdfGenerator';

const GAP_PX = 8; // gap tra le pagine affiancate in px

// ── Carica un'immagine come HTMLImageElement (async) ─────────
function loadImage(src) {
    return new Promise((resolve) => {
        if (!src) { resolve(null); return; }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// ── Linee di taglio su canvas ────────────────────────────────
function drawCropMarksCanvas(ctx, cellX, cellY, bleedPx, cardWpx, cardHpx, scale) {
    const gap = Math.max(1, 0.5 * scale);
    const len = Math.max(3, 3 * scale);

    const cx = cellX + bleedPx;
    const cy = cellY + bleedPx;

    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = Math.max(0.5, 0.3 * scale);

    const lines = [
        // Top-left
        [cx - gap - len, cy, cx - gap, cy],
        [cx, cy - gap - len, cx, cy - gap],
        // Top-right
        [cx + cardWpx + gap, cy, cx + cardWpx + gap + len, cy],
        [cx + cardWpx, cy - gap - len, cx + cardWpx, cy - gap],
        // Bottom-left
        [cx - gap - len, cy + cardHpx, cx - gap, cy + cardHpx],
        [cx, cy + cardHpx + gap, cx, cy + cardHpx + gap + len],
        // Bottom-right
        [cx + cardWpx + gap, cy + cardHpx, cx + cardWpx + gap + len, cy + cardHpx],
        [cx + cardWpx, cy + cardHpx + gap, cx + cardWpx, cy + cardHpx + gap + len],
    ];

    lines.forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
}

// ── Singola pagina canvas ─────────────────────────────────────
export function PageCanvas({ pageImages, formatKey, bleedMm, previewW, empty }) {
    const canvasRef = useRef();
    const info = getGridInfo(formatKey, bleedMm);
    const scale = previewW / info.pageW;
    const previewH = Math.round(info.pageH * scale);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = previewW;
        canvas.height = previewH;
        const ctx = canvas.getContext('2d');

        const draw = async () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, previewW, previewH);

            const imgs = await Promise.all(
                (pageImages || []).map(src => loadImage(src))
            );

            const { cols, rows, cellW, cellH, offsetX, offsetY } = info;
            const bleedPx = bleedMm * scale;
            const cardWpx = CARD_W * scale;
            const cardHpx = CARD_H * scale;

            for (let i = 0; i < cols * rows; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = (offsetX + col * cellW) * scale;
                const y = (offsetY + row * cellH) * scale;
                const w = cellW * scale;
                const h = cellH * scale;

                if (!empty && imgs[i]) {
                    ctx.drawImage(imgs[i], x, y, w, h);
                } else {
                    ctx.fillStyle = empty ? '#f0f0f0' : '#d0d0d0';
                    ctx.fillRect(x + bleedPx, y + bleedPx, cardWpx, cardHpx);

                    if (bleedMm > 0) {
                        ctx.fillStyle = empty ? '#f8f8f8' : '#e4e4e4';
                        ctx.fillRect(x, y, w, h);
                        ctx.fillStyle = empty ? '#f0f0f0' : '#d0d0d0';
                        ctx.fillRect(x + bleedPx, y + bleedPx, cardWpx, cardHpx);
                    }
                }

                drawCropMarksCanvas(ctx, x, y, bleedPx, cardWpx, cardHpx, scale);
            }

            ctx.strokeStyle = '#c8c8c8';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(0.5, 0.5, previewW - 1, previewH - 1);
        };

        draw();
    }, [pageImages, formatKey, bleedMm, previewW, empty, info, scale, previewH]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: previewW, height: previewH, display: 'block', flexShrink: 0 }}
        />
    );
}

// ── Componente principale ─────────────────────────────────────
export default function PagePreview({ images, formatKey, bleedMm }) {
    const [pageOffset, setPageOffset] = useState(0);
    const [containerW, setContainerW] = useState(0);
    const panelRef = useRef(null);

    const info = getGridInfo(formatKey, bleedMm);
    const perPage = Math.max(1, info.perPage);
    const totalPages = images.length === 0 ? 1 : Math.ceil(images.length / perPage);

    // Misura la larghezza del container con ResizeObserver
    useEffect(() => {
        const el = panelRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width ?? 0;
            setContainerW(w);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Reset offset quando cambiano format/bleed
    useEffect(() => setPageOffset(0), [formatKey, bleedMm]);
    // Clamp offset
    useEffect(() => {
        if (pageOffset >= totalPages) setPageOffset(Math.max(0, totalPages - 1));
    }, [totalPages, pageOffset]);

    const visiblePages = [0, 1, 2, 3]
        .map(i => pageOffset + i)
        .filter(p => p < totalPages);

    // Calcola la larghezza di ogni canvas in base allo spazio disponibile
    // Sottrae i gap tra le pagine, poi divide per il numero di pagine visibili
    const numVisible = Math.max(1, visiblePages.length);
    const pageCanvasW = containerW > 0
        ? Math.floor((containerW - GAP_PX * (numVisible - 1)) / numVisible)
        : 200; // fallback prima che ResizeObserver risponda

    const getPageImages = (pageIdx) =>
        Array.from({ length: perPage }, (_, i) =>
            images[pageIdx * perPage + i]?.preview ?? null
        );

    const canNavPrev = pageOffset > 0;
    const canNavNext = pageOffset + 4 < totalPages;

    return (
        <div className="preview-panel" ref={panelRef}>
            <div className="preview-section-header">
                <span className="preview-section-label">Anteprima</span>
                {totalPages > 1 && (
                    <div className="preview-nav">
                        <button
                            className="nav-btn"
                            disabled={!canNavPrev}
                            onClick={() => setPageOffset(p => p - 4)}
                            aria-label="Pagine precedenti"
                        >‹</button>
                        <span className="nav-info">
                            {pageOffset + 1}–{Math.min(pageOffset + 4, totalPages)} / {totalPages}
                        </span>
                        <button
                            className="nav-btn"
                            disabled={!canNavNext}
                            onClick={() => setPageOffset(p => p + 4)}
                            aria-label="Pagine successive"
                        >›</button>
                    </div>
                )}
            </div>
            <div className="preview-pages-row" style={{ gap: GAP_PX }}>
                {visiblePages.map(pageIdx => (
                    <div key={pageIdx} className="preview-page-wrap">
                        <PageCanvas
                            pageImages={getPageImages(pageIdx)}
                            formatKey={formatKey}
                            bleedMm={bleedMm}
                            previewW={pageCanvasW}
                            empty={images.length === 0}
                        />
                        {images.length > 0 && (
                            <span className="page-label">Pag. {pageIdx + 1}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
