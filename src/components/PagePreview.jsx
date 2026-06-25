import { useRef, useEffect, useState, useMemo } from 'react';
import { getGridInfo, cropMarkSpan, drawCardWithBleed, resolveBleedMode, bleedLabel } from '../utils/pdfGenerator';
import { IconX, IconCopy, IconFrame, IconPlus } from './icons';

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
function drawCropMarksCanvas(ctx, cellX, cellY, bleedPx, cardWpx, cardHpx, scale, limits, style = 'lines') {
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

    if (style === 'corners') {
        // Squadrette ad angolo (vedi drawCropMarks PDF): vertice in fuori di g, bracci len verso la carta.
        const g = bleedPx > 0 ? Math.min(0.6 * scale, bleedPx) : 0.6 * scale;
        const len2 = Math.min(len, cardWpx * 0.45, cardHpx * 0.45);
        const bracket = (vx, vy, sx, sy) => { seg(vx, vy, vx + sx * len2, vy); seg(vx, vy, vx, vy + sy * len2); };
        bracket(cx - g, cy - g, 1, 1);
        bracket(cx + cardWpx + g, cy - g, -1, 1);
        bracket(cx - g, cy + cardHpx + g, 1, -1);
        bracket(cx + cardWpx + g, cy + cardHpx + g, -1, -1);
        return;
    }

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
export function PageCanvas({ pageImages, formatKey, bleedMm, bleedStyle, dpi, cardW, cardH, showCrop, cropStyle, customSheet, previewW, empty }) {
    const canvasRef = useRef();
    // Cache src(objectURL) -> HTMLImageElement decodificata: evita di ri-decodificare
    // le immagini a ogni ridisegno (cancellazione carta, resize, cambio pagina/formato).
    const cacheRef = useRef(new Map());
    const info = useMemo(() => getGridInfo(formatKey, bleedMm, cardW, cardH, customSheet), [formatKey, bleedMm, cardW, cardH, customSheet]);
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
        const load = (item) => {
            const src = item?.src;
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
            (pageImages || []).forEach((item, i) => { if (item?.src && imgs[i]) next.set(item.src, imgs[i]); });
            cacheRef.current = next;

            const { cols, rows, cellW, cellH, offsetX, offsetY } = info;
            const bleedPx = bleedMm * scale;
            const cardWpx = cardW * scale;
            const cardHpx = cardH * scale;

            for (let i = 0; i < cols * rows; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = (offsetX + col * cellW) * scale;
                const y = (offsetY + row * cellH) * scale;
                const w = cellW * scale;
                const h = cellH * scale;

                if (!empty && imgs[i]) {
                    const mode = resolveBleedMode(pageImages[i]?.bleedMode, bleedStyle);
                    if (mode !== 'none') {
                        // Sfondo nero dietro la carta: gli angoli arrotondati
                        // trasparenti dei PNG non lasciano tacche bianche.
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(x, y, w, h);
                        drawCardWithBleed(ctx, imgs[i], x, y, w, h, bleedPx, mode);
                    } else {
                        // niente abbondanza: carta a misura di taglio (63×88), margine vuoto.
                        // Non riempie la cella → togliere l'abbondanza non ingrandisce la carta.
                        ctx.drawImage(imgs[i], x + bleedPx, y + bleedPx, cardWpx, cardHpx);
                    }
                    // Avviso bassa risoluzione: la sorgente non copre metà dei px
                    // richiesti al DPI scelto → stampa sgranata. ponytail: soglia
                    // 0.5× fissa; le PNG Scryfall (~300 DPI a misura carta) non avvisano
                    // fino a >600 DPI. Marker triangolo rosso nell'angolo del trim.
                    const effDpi = imgs[i].naturalWidth / (cardW / 25.4);
                    if (effDpi < dpi * 0.5) {
                        const s = Math.max(9, 15 * scale);
                        const mx = x + bleedPx;
                        const my = y + bleedPx;
                        ctx.fillStyle = '#ef4444';
                        ctx.beginPath();
                        ctx.moveTo(mx, my);
                        ctx.lineTo(mx + s, my);
                        ctx.lineTo(mx, my + s);
                        ctx.closePath();
                        ctx.fill();
                        ctx.fillStyle = '#fff';
                        ctx.font = `bold ${Math.round(s * 0.55)}px sans-serif`;
                        ctx.textBaseline = 'top';
                        ctx.fillText('!', mx + s * 0.1, my + s * 0.02);
                    }
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
                if (showCrop) drawCropMarksCanvas(ctx, x, y, bleedPx, cardWpx, cardHpx, scale, limits, cropStyle);
            }

            ctx.strokeStyle = '#c8c8c8';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(0.5, 0.5, previewW - 1, previewH - 1);
        };

        draw();
        return () => { cancelled = true; };
    }, [pageImages, formatKey, bleedMm, bleedStyle, dpi, cardW, cardH, showCrop, cropStyle, customSheet, previewW, empty, info, scale, previewH]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: previewW, height: previewH, display: 'block', flexShrink: 0 }}
        />
    );
}

// ── Componente principale ─────────────────────────────────────
export default function PagePreview({ images, formatKey, bleedMm, bleedStyle, dpi, cardW, cardH, showCrop, cropStyle, customSheet, onRemove, onChangeArt, onToggleBleed, onDuplicate, isDragActive, missing, onCardTap, onAdd, onRemoveMany, onBleedMany }) {
    const [pageOffset, setPageOffset] = useState(0);
    const [box, setBox] = useState({ w: 0, h: 0 });
    const stageRef = useRef(null);

    const info = useMemo(() => getGridInfo(formatKey, bleedMm, cardW, cardH, customSheet), [formatKey, bleedMm, cardW, cardH, customSheet]);
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
        () => Array.from({ length: perPage }, (_, i) => {
            const it = images[page * perPage + i];
            return it ? { src: it.preview, bleedMode: it.bleedMode } : null;
        }),
        [images, perPage, page]
    );

    const canPrev = page > 0;
    const canNext = page < totalPages - 1;

    // Selezione multipla (solo desktop = !onCardTap): ctrl/cmd/shift-click marca le carte,
    // poi azioni in blocco. Click semplice resta "cambia art" → i novizi non se ne accorgono.
    const [selected, setSelected] = useState(() => new Set());
    const selectMode = !onCardTap;
    // Tieni solo gli id ancora esistenti (carte cancellate / pagina cambiata).
    const selectedIds = useMemo(
        () => images.filter(i => selected.has(i.id)).map(i => i.id),
        [images, selected],
    );
    const clearSel = () => setSelected(new Set());
    const toggleSel = (id) => setSelected(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });
    const handleCardClick = (e, id) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) { e.preventDefault(); toggleSel(id); }
        else onChangeArt(id);
    };

    // Scorciatoie: Del = elimina selezione, Esc = deseleziona, Ctrl/Cmd+A = seleziona tutto.
    useEffect(() => {
        if (!selectMode) return;
        const onKey = (e) => {
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size) {
                e.preventDefault(); onRemoveMany?.(selectedIds); clearSel();
            } else if (e.key === 'Escape' && selected.size) {
                clearSel();
            } else if ((e.key === 'a' || e.key === 'A') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault(); setSelected(new Set(images.map(i => i.id)));
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectMode, selected, selectedIds, images, onRemoveMany]);

    return (
        <div className={`preview-root${isDragActive ? ' drag-active' : ''}`}>
            <div className="preview-stage" ref={stageRef}>
                <div className="preview-page-wrap" style={{ width: pageW }}>
                    <PageCanvas
                        pageImages={pageImages}
                        formatKey={formatKey}
                        bleedMm={bleedMm}
                        bleedStyle={bleedStyle}
                        dpi={dpi}
                        cardW={cardW}
                        cardH={cardH}
                        showCrop={showCrop}
                        cropStyle={cropStyle}
                        customSheet={customSheet}
                        previewW={pageW}
                        empty={images.length === 0}
                    />
                    {images.length === 0 && !isDragActive && (
                        <div className="preview-empty-cta">
                            <p className="empty-cta-title">No cards yet</p>
                            <p className="empty-cta-sub">Drop card images here, or import from Scryfall / MPCFill.</p>
                            {onAdd && (
                                <button type="button" className="btn-add empty-cta-btn" onClick={onAdd}>
                                    <IconPlus size={18} /> Add cards
                                </button>
                            )}
                        </div>
                    )}
                    {images.length > 0 && (
                        <p className="sr-only" aria-live="polite">
                            Print sheet preview: {images.length} card{images.length !== 1 ? 's' : ''} placed, page {page + 1} of {totalPages}.
                        </p>
                    )}
                    {images.length > 0 && (
                        <div className="preview-card-layer">
                            {Array.from({ length: info.perPage }, (_, i) => {
                                const img = images[page * perPage + i];
                                if (!img) return null;
                                const col = i % info.cols;
                                const row = Math.floor(i / info.cols);
                                const left = (info.offsetX + col * info.cellW + bleedMm) * scale;
                                const top = (info.offsetY + row * info.cellH + bleedMm) * scale;
                                const name = (img.file?.name || `Card ${page * perPage + i + 1}`).replace(/\.[^.]+$/, '');
                                const lowRes = img.w && img.w < dpi * 0.5 * (cardW / 25.4);
                                const isSel = selected.has(img.id);
                                return (
                                    <div
                                        key={img.id}
                                        className={`preview-card-hotspot${isSel ? ' selected' : ''}`}
                                        style={{ left, top, width: cardW * scale, height: cardH * scale }}
                                    >
                                        {/* Superficie carta = button a tutta area → "cambia art" raggiungibile da tastiera. */}
                                        {onCardTap ? (
                                            <button
                                                type="button"
                                                className="card-surface"
                                                onClick={() => onCardTap(img.id)}
                                                aria-label={`Edit ${name}`}
                                            />
                                        ) : (<>
                                        <button
                                            type="button"
                                            className="card-surface"
                                            onClick={(e) => handleCardClick(e, img.id)}
                                            title="Change art — Ctrl-click to select"
                                            aria-label={`${name}. Change art. Ctrl or Shift click to select.`}
                                            aria-pressed={isSel || undefined}
                                        />
                                        <button
                                            type="button"
                                            className="preview-card-dup"
                                            onClick={(e) => { e.stopPropagation(); onDuplicate(img.id); }}
                                            title="Duplicate"
                                            aria-label={`Duplicate ${img.file.name}`}
                                        >
                                            <IconCopy size={11} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`preview-card-bleed${img.bleedMode !== 'none' ? ' on' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); onToggleBleed(img.id); }}
                                            title={`Bleed: ${bleedLabel(img.bleedMode)} (click to change)`}
                                            aria-label={`Bleed: ${bleedLabel(img.bleedMode)}`}
                                            aria-pressed={img.bleedMode !== 'none'}
                                        >
                                            <IconFrame size={11} />
                                        </button>
                                        <button
                                            type="button"
                                            className="preview-card-delete"
                                            onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                                            title="Remove"
                                            aria-label={`Remove ${img.file.name}`}
                                        >
                                            <IconX size={12} />
                                        </button>
                                        {lowRes && <span className="sr-only">Low resolution for {dpi} DPI — may print soft.</span>}
                                        </>)}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="preview-footer">
                {selectMode && selectedIds.length > 0 ? (
                    <div className="bulk-bar" role="toolbar" aria-label="Selected cards">
                        <span className="bulk-count">{selectedIds.length} selected</span>
                        <button type="button" className="bulk-btn" onClick={() => onBleedMany?.(selectedIds)}>
                            <IconFrame size={13} /> Bleed
                        </button>
                        <button type="button" className="bulk-btn bulk-del" onClick={() => { onRemoveMany?.(selectedIds); clearSel(); }}>
                            <IconX size={13} /> Delete
                        </button>
                        <button type="button" className="bulk-btn bulk-clear" onClick={clearSel}>Clear</button>
                    </div>
                ) : (<>
                    {totalPages > 1 && (
                        <div className="preview-nav">
                            <button
                                className="nav-btn"
                                disabled={!canPrev}
                                onClick={() => setPageOffset(page - 1)}
                                aria-label="Previous page"
                            >‹</button>
                            <span className="nav-info">{page + 1}/{totalPages}</span>
                            <button
                                className="nav-btn"
                                disabled={!canNext}
                                onClick={() => setPageOffset(page + 1)}
                                aria-label="Next page"
                            >›</button>
                        </div>
                    )}
                    {images.length > 0 && (
                        <span className="preview-count">
                            {images.length} img{missing > 0 ? ` · ${missing} to fill the page` : ''}
                        </span>
                    )}
                </>)}
            </div>
        </div>
    );
}
