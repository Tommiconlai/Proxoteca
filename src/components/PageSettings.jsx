import { PAPER_FORMATS, CARD_W, CARD_H, getGridInfo } from '../utils/pdfGenerator';
import { PageCanvas } from './PagePreview';

const DPI_OPTIONS = [150, 300, 600, 800, 1000, 1200];
const BLEED_OPTIONS = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

export default function PageSettings({ formatKey, setFormatKey, bleedMm, setBleedMm, dpi, setDpi }) {
    const { cols, rows, perPage } = getGridInfo(formatKey, bleedMm);
    const [pw, ph] = PAPER_FORMATS[formatKey];
    const totalWmm = (CARD_W + bleedMm * 2).toFixed(1);
    const totalHmm = (CARD_H + bleedMm * 2).toFixed(1);

    return (
        <>
            {/* Formato carta */}
            <div className="sidebar-section">
                <h2>Formato carta</h2>
                <div className="glass-card compact">
                    <div className="select-wrapper">
                        <select value={formatKey} onChange={e => setFormatKey(e.target.value)}>
                            {Object.keys(PAPER_FORMATS).map(k => {
                                const [w, h] = PAPER_FORMATS[k];
                                return <option key={k} value={k}>{k} — {w}×{h} mm</option>;
                            })}
                        </select>
                    </div>
                </div>
            </div>

            {/* Bordo al vivo */}
            <div className="sidebar-section">
                <h2>Bordo al vivo</h2>
                <div className="glass-card compact">
                    <div className="select-wrapper">
                        <select value={bleedMm} onChange={e => setBleedMm(parseFloat(e.target.value))}>
                            {BLEED_OPTIONS.map(v => (
                                <option key={v} value={v}>{v.toFixed(1)} mm</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Risoluzione DPI */}
            <div className="sidebar-section">
                <h2>Risoluzione</h2>
                <div className="glass-card compact">
                    <div className="select-wrapper">
                        <select value={dpi} onChange={e => setDpi(parseInt(e.target.value, 10))}>
                            {DPI_OPTIONS.map(v => (
                                <option key={v} value={v}>{v} DPI</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Info layout */}
            <div className="sidebar-section">
                <h2>Layout</h2>
                <div className="layout-preview" style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <PageCanvas
                        pageImages={[]}
                        formatKey={formatKey}
                        bleedMm={bleedMm}
                        previewW={240}
                        empty
                    />
                </div>
                <div className="info-box">
                    <strong>Dimensione carta:</strong> {pw}×{ph} mm<br />
                    <strong>Dimensione cella:</strong> {totalWmm}×{totalHmm} mm<br />
                    <strong>Griglia:</strong> {cols} col × {rows} righe<br />
                    <strong>Immagini per pagina:</strong> {perPage}<br />
                    <strong>Risoluzione output:</strong> {dpi} DPI
                </div>
            </div>

        </>
    );
}
