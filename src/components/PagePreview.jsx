import { useRef, useEffect, useState, useMemo } from 'react';
import { getGridInfo, CARD_W, CARD_H, cropMarkSpan } from '../utils/pdfGenerator';
import { IconX, IconPlus } from './icons';

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
function drawCropMarksCanvas(ctx, cellX, cellY, bleedPx, cardWpx, cardHpx, scale, limits) {
    const gap = 0.5 * scale;
    const len = 3 * scale;

    const cx = cellX + bleedPx;
    const cy = cellY + bleedPx;

    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = Math.max(0.5, 0.3 * scale);

    const seg = (x1, y1, x2, y2) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    };

    const L = cropMarkSpan(limits.left, gap, len);
    const R = cropMarkSpan(limits.right, gap, len);
    const U = cropMarkSpan(limits.up, gap, len);
    const D = cropMarkSpan(limits.down, gap, len);

    // Orizzontali (sinistra/destra dai bordi verticali del trim)
    if (L) {
        seg(cx - L.b, cy, cx - L.a, cy);
        seg(cx - L.b, cy + cardHpx, cx - L.a, cy + cardHpx);
    }
    if (R) {
        seg(cx + cardWpx + R.a, cy, cx + cardWpx + R.b, cy);
        seg(cx + cardWpx + R.a, cy + cardHpx, cx + cardWpx + R.b, cy + cardHpx);
    }
    // Verticali (alto/basso dai bordi orizzontali del trim)
    if (U) {
        seg(cx, cy - U.b, cx, cy - U.a);
        seg(cx + cardWpx, cy - U.b, cx + cardWpx, cy - U.a);
    }
    if (D) {
        seg(cx, cy + cardHpx + D.a, cx, cy + cardHpx + D.b);
        seg(cx + cardWpx, cy + cardHpx + D.a, cx + cardWpx, cy + cardHpx + D.b);
    }
}

// ── Singola pagina canvas ─────────────────────────────────────
export function PageCanvas({ pageImages, formatKey, bleedMm, previewW, empty }) {
    const canvasRef = useRef();
    // Cache src(objectURL) -> HTMLImageElement decodificata: evita di ri-decodificare
    // le immagini a ogni ridisegno (cancellazione carta, resize, cambio pagina/formato).
    const cacheRef = useRef(new Map());
    const info = useMemo(() => getGridInfo(formatKey, bleedMm), [formatKey, bleedMm]);
    const scale = previewW / info.pageW;
    const previewH = Math.round(info.pageH * scale);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let cancelled = false;
        canvas.width = previewW;
        canvas.height = previewH;
        const ctx = canvas.getContext('2d');

        const cache = cacheRef.current;
        const load = (src) => {
            if (!src) return null;
            return cache.get(src) || loadImage(src); // hit in cache = nessun re-decode
        };

        const draw = async () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, previewW, previewH);

            const imgs = await Promise.all((pageImages || []).map(load));
            if (cancelled) return;

            // Ricostruisce la cache con le sole immagini della pagina corrente
            // (memoria limitata; le immagini cancellate vengono scartate e liberate).
            const next = new Map();
            (pageImages || []).forEach((src, i) => { if (src && imgs[i]) next.set(src, imgs[i]); });
            cacheRef.current = next;

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

                const limits = {
                    left:  (col === 0 ? offsetX * scale : 0) + bleedPx,
                    right: (col === cols - 1 ? offsetX * scale : 0) + bleedPx,
                    up:    (row === 0 ? offsetY * scale : 0) + bleedPx,
                    down:  (row === rows - 1 ? offsetY * scale : 0) + bleedPx,
                };
                drawCropMarksCanvas(ctx, x, y, bleedPx, cardWpx, cardHpx, scale, limits);
            }

            ctx.strokeStyle = '#c8c8c8';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(0.5, 0.5, previewW - 1, previewH - 1);
        };

        draw();
        return () => { cancelled = true; };
    }, [pageImages, formatKey, bleedMm, previewW, empty, info, scale, previewH]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: previewW, height: previewH, display: 'block', flexShrink: 0 }}
        />
    );
}

// ── Componente principale ─────────────────────────────────────
export default function PagePreview({ images, formatKey, bleedMm, onRemove, onAddPhotos, isDragActive, missing }) {
    const [pageOffset, setPageOffset] = useState(0);
    const [box, setBox] = useState({ w: 0, h: 0 });
    const stageRef = useRef(null);

    const info = useMemo(() => getGridInfo(formatKey, bleedMm), [formatKey, bleedMm]);
    const perPage = Math.max(1, info.perPage);
    const totalPages = images.length === 0 ? 1 : Math.ceil(images.length / perPage);

    // Reset pagina al cambio formato/bleed — setState durante il render (no effect).
    const [prevFmt, setPrevFmt] = useState(formatKey);
    const [prevBleed, setPrevBleed] = useState(bleedMm);
    if (prevFmt !== formatKey || prevBleed !== bleedMm) {
        setPrevFmt(formatKey);
        setPrevBleed(bleedMm);
        setPageOffset(0);
    }

    // Pagina corrente con clamp derivato (totalPages >= 1).
    const page = Math.min(pageOffset, totalPages - 1);

    // Misura lo stage (larghezza + altezza disponibili) per dimensionare la pagina.
    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const r = entry.contentRect;
            setBox({ w: r.width, h: r.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // La pagina riempie lo spazio mantenendo le proporzioni carta,
    // limitata sia in larghezza sia in altezza.
    const PAD = 16;
    const ratio = info.pageW / info.pageH;
    const availW = Math.max(0, box.w - PAD * 2);
    const availH = Math.max(0, box.h - PAD * 2);
    const pageW = box.w > 0
        ? Math.max(160, Math.floor(Math.min(availW, availH * ratio)))
        : 360; // fallback prima che il ResizeObserver risponda
    const scale = pageW / info.pageW;

    // Immagini della pagina corrente (riferimento stabile finché non cambiano).
    const pageImages = useMemo(
        () => Array.from({ length: perPage }, (_, i) => images[page * perPage + i]?.preview ?? null),
        [images, perPage, page]
    );

    const canPrev = page > 0;
    const canNext = page < totalPages - 1;

    return (
        <div className={`preview-root${isDragActive ? ' drag-active' : ''}`}>
            <div className="preview-stage" ref={stageRef}>
                <div className="preview-page-wrap" style={{ width: pageW }}>
                    <PageCanvas
                        pageImages={pageImages}
                        formatKey={formatKey}
                        bleedMm={bleedMm}
                        previewW={pageW}
                        empty={images.length === 0}
                    />
                    {images.length > 0 && (
                        <div className="preview-card-layer">
                            {Array.from({ length: info.perPage }, (_, i) => {
                                const img = images[page * perPage + i];
                                if (!img) return null;
                                const col = i % info.cols;
                                const row = Math.floor(i / info.cols);
                                const left = (info.offsetX + col * info.cellW + bleedMm) * scale;
                                const top = (info.offsetY + row * info.cellH + bleedMm) * scale;
                                return (
                                    <div
                                        key={img.id}
                                        className="preview-card-hotspot"
                                        style={{
                                            left,
                                            top,
                                            width: CARD_W * scale,
                                            height: CARD_H * scale,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className="preview-card-delete"
                                            onClick={() => onRemove(img.id)}
                                            title="Rimuovi"
                                            aria-label={`Rimuovi ${img.file.name}`}
                                        >
                                            <IconX size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="preview-footer">
                {totalPages > 1 && (
                    <div className="preview-nav">
                        <button
                            className="nav-btn"
                            disabled={!canPrev}
                            onClick={() => setPageOffset(page - 1)}
                            aria-label="Pagina precedente"
                        >‹</button>
                        <span className="nav-info">{page + 1}/{totalPages}</span>
                        <button
                            className="nav-btn"
                            disabled={!canNext}
                            onClick={() => setPageOffset(page + 1)}
                            aria-label="Pagina successiva"
                        >›</button>
                    </div>
                )}
                {images.length > 0 && (
                    <span className="preview-count">
                        {images.length} img{missing > 0 ? ` · ${missing} mancanti` : ''}
                    </span>
                )}
                <button
                    type="button"
                    className="add-photos-btn"
                    onClick={onAddPhotos}
                    title="Aggiungi foto"
                    aria-label="Aggiungi foto"
                >
                    <IconPlus size={26} />
                </button>
            </div>
        </div>
    );
}
