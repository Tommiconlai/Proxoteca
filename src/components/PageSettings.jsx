import { PAPER_FORMATS, getGridInfo } from '../utils/pdfGenerator';

const DPI_OPTIONS = [150, 300, 600, 800, 1000, 1200];
const BLEED_OPTIONS = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
const BLEED_STYLE_OPTIONS = [
    { value: 'auto', label: 'Auto (per carta)' },
    { value: 'mirror', label: 'Specchio' },
    { value: 'stretch', label: 'Stira' },
    { value: 'black', label: 'Nero' },
];
// Preset dimensioni carta in mm. 'custom' → input liberi.
const CARD_TYPES = [
    { key: 'mtg', label: 'Standard — 63×88', w: 63, h: 88 },
    { key: 'small', label: 'Piccola / JP — 59×86', w: 59, h: 86 },
    { key: 'mini', label: 'Mini USA — 41×63', w: 41, h: 63 },
    { key: 'tarot', label: 'Tarot — 70×120', w: 70, h: 120 },
    { key: 'custom', label: 'Personalizzata…', w: 0, h: 0 },
];

// Label-sopra + select. aria-label associa il nome al control (niente <label for>).
function SelectField({ label, value, onChange, children }) {
    return (
        <div className="field">
            <span className="field-label">{label}</span>
            <div className="select-wrapper">
                <select value={value} onChange={onChange} aria-label={label}>{children}</select>
            </div>
        </div>
    );
}

export default function PageSettings({
    formatKey, setFormatKey, bleedMm, setBleedMm, bleedStyle, setBleedStyle, dpi, setDpi,
    cardType, setCardType, cardW, setCardW, cardH, setCardH,
    cropMarks, setCropMarks, cropStyle, setCropStyle,
    sheetUnit, setSheetUnit, sheetW, setSheetW, sheetH, setSheetH, customSheet,
}) {
    const { cols, rows, perPage } = getGridInfo(formatKey, bleedMm, cardW, cardH, customSheet);
    const [pw, ph] = formatKey === 'custom' && customSheet
        ? customSheet.map((v) => Math.round(v * 10) / 10)
        : PAPER_FORMATS[formatKey];
    const totalWmm = (cardW + bleedMm * 2).toFixed(1);
    const totalHmm = (cardH + bleedMm * 2).toFixed(1);

    const onTypeChange = (key) => {
        setCardType(key);
        const t = CARD_TYPES.find((c) => c.key === key);
        if (t && key !== 'custom') { setCardW(t.w); setCardH(t.h); }
    };

    // Cambio unità foglio: converte i valori mostrati (mm↔inch) mantenendo la misura.
    const onUnitChange = (u) => {
        if (u === sheetUnit) return;
        const conv = (v) => (u === 'in' ? Math.round((v / 25.4) * 100) / 100 : Math.round(v * 25.4 * 10) / 10);
        setSheetW(conv(sheetW));
        setSheetH(conv(sheetH));
        setSheetUnit(u);
    };

    return (
        <>
            {/* Gruppo 1 — Foglio & carta */}
            <div className="sidebar-section">
                <h2>Foglio &amp; carta</h2>
                <div className="glass-card compact settings-group">
                    <div className="field">
                        <span className="field-label">Formato foglio</span>
                        <div className="select-wrapper">
                            <select value={formatKey} onChange={e => setFormatKey(e.target.value)} aria-label="Formato foglio">
                                {Object.keys(PAPER_FORMATS).map(k => {
                                    const [w, h] = PAPER_FORMATS[k];
                                    return <option key={k} value={k}>{k} — {w}×{h} mm</option>;
                                })}
                                <option value="custom">Personalizzato…</option>
                            </select>
                        </div>
                        {formatKey === 'custom' && (
                            <>
                                <div className="unit-toggle">
                                    <button type="button" className={sheetUnit === 'mm' ? 'active' : ''} onClick={() => onUnitChange('mm')}>mm</button>
                                    <button type="button" className={sheetUnit === 'in' ? 'active' : ''} onClick={() => onUnitChange('in')}>inch</button>
                                </div>
                                <div className="card-size-custom">
                                    <label>L
                                        <input type="number" min="1" step={sheetUnit === 'in' ? '0.1' : '1'}
                                            value={sheetW} onChange={e => setSheetW(Number(e.target.value))} />
                                        {sheetUnit}
                                    </label>
                                    <label>A
                                        <input type="number" min="1" step={sheetUnit === 'in' ? '0.1' : '1'}
                                            value={sheetH} onChange={e => setSheetH(Number(e.target.value))} />
                                        {sheetUnit}
                                    </label>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="field">
                        <span className="field-label">Tipo carta</span>
                        <div className="select-wrapper">
                            <select value={cardType} onChange={e => onTypeChange(e.target.value)} aria-label="Tipo carta">
                                {CARD_TYPES.map(t => (
                                    <option key={t.key} value={t.key}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        {cardType === 'custom' && (
                            <div className="card-size-custom">
                                <label>L
                                    <input type="number" min="20" max="200" step="0.5"
                                        value={cardW} onChange={e => setCardW(Number(e.target.value))} />
                                    mm
                                </label>
                                <label>A
                                    <input type="number" min="20" max="200" step="0.5"
                                        value={cardH} onChange={e => setCardH(Number(e.target.value))} />
                                    mm
                                </label>
                            </div>
                        )}
                    </div>

                    <SelectField label="Bordo al vivo" value={bleedMm} onChange={e => setBleedMm(parseFloat(e.target.value))}>
                        {BLEED_OPTIONS.map(v => (
                            <option key={v} value={v}>{v.toFixed(1)} mm</option>
                        ))}
                    </SelectField>
                </div>
            </div>

            {/* Gruppo 2 — Stampa */}
            <div className="sidebar-section">
                <h2>Stampa</h2>
                <div className="glass-card compact settings-group">
                    <SelectField label="Stile abbondanza" value={bleedStyle} onChange={e => setBleedStyle(e.target.value)}>
                        {BLEED_STYLE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </SelectField>

                    <SelectField label="Risoluzione" value={dpi} onChange={e => setDpi(parseInt(e.target.value, 10))}>
                        {DPI_OPTIONS.map(v => (
                            <option key={v} value={v}>{v} DPI</option>
                        ))}
                    </SelectField>

                    <div className="field">
                        <label className="checkbox-row">
                            <input type="checkbox" checked={cropMarks} onChange={e => setCropMarks(e.target.checked)} />
                            <span>Mostra crocini</span>
                        </label>
                        {cropMarks && (
                            <div className="select-wrapper" style={{ marginTop: 10 }}>
                                <select value={cropStyle} onChange={e => setCropStyle(e.target.value)} aria-label="Stile crocini">
                                    <option value="lines">Linee</option>
                                    <option value="corners">Squadrette ad angolo</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Riepilogo */}
            <div className="sidebar-section">
                <h2>Riepilogo</h2>
                <div className="info-box">
                    <strong>Foglio:</strong> {pw}×{ph} mm<br />
                    <strong>Carta:</strong> {cardW}×{cardH} mm<br />
                    <strong>Cella:</strong> {totalWmm}×{totalHmm} mm<br />
                    <strong>Griglia:</strong> {cols}×{rows} · {perPage}/pagina
                </div>
            </div>
        </>
    );
}
