import { useState } from 'react';
import { parseCardList, fetchScryfallImages, fetchDeckList } from '../utils/scryfall';
import { IconX } from './icons';

export default function ScryfallImportModal({ open, onClose, onImport }) {
    const [text, setText] = useState(() => localStorage.getItem('ip:cardlist') || ''); // sopravvive al reload
    const [link, setLink] = useState('');
    const [loadingLink, setLoadingLink] = useState(false);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [result, setResult] = useState(null); // { imported, notFound }
    const [error, setError] = useState(null);

    if (!open) return null;

    const close = () => { if (!busy && !loadingLink) onClose(); };

    // Carica una lista da un link deck nella textarea (poi import normale).
    const handleLoadLink = async () => {
        const u = link.trim();
        if (!u) return;
        setError(null); setResult(null); setLoadingLink(true);
        try {
            const list = await fetchDeckList(u);
            if (!list) { setError('Nessuna carta trovata nel deck (formato del sito cambiato?).'); return; }
            setText(list);
            localStorage.setItem('ip:cardlist', list);
        } catch (e) {
            setError(e.message || 'Errore nel caricare il deck.');
        } finally {
            setLoadingLink(false);
        }
    };

    const handleImport = async () => {
        const entries = parseCardList(text);
        if (!entries.length) { setError('Inserisci almeno una carta.'); return; }
        setError(null);
        setResult(null);
        setBusy(true);
        setProgress({ done: 0, total: 0 });
        try {
            const { files, notFound } = await fetchScryfallImages(
                entries,
                (done, total) => setProgress({ done, total }),
            );
            if (files.length) onImport(files);
            setResult({ imported: files.length, notFound });
        } catch (e) {
            setError(e.message || 'Errore durante l’import.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={close}>
            <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Importa da Scryfall">
                <div className="modal-header">
                    <h2>Importa da Scryfall</h2>
                    <button className="modal-close" onClick={close} aria-label="Chiudi" disabled={busy}>
                        <IconX size={18} />
                    </button>
                </div>

                <p className="modal-hint">
                    Incolla un link deck oppure la lista a mano. Una carta per riga, formato
                    {' '}<code>1x Nome Carta</code>; aggiungi <code>(SET) num</code> per scegliere la stampa.
                    Le doppia-faccia importano fronte e retro.
                </p>

                <div className="import-link-row">
                    <input
                        type="url"
                        className="import-link-input"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleLoadLink(); }}
                        placeholder="Link deck (Moxfield, Archidekt, Tappedout)"
                        disabled={busy || loadingLink}
                        spellCheck={false}
                    />
                    <button
                        className="btn-secondary"
                        onClick={handleLoadLink}
                        disabled={busy || loadingLink || !link.trim()}
                    >
                        {loadingLink ? <><span className="spinner" /> Carico…</> : 'Carica'}
                    </button>
                </div>

                <textarea
                    className="import-textarea"
                    value={text}
                    onChange={(e) => { setText(e.target.value); localStorage.setItem('ip:cardlist', e.target.value); if (result) setResult(null); }}
                    placeholder={'1x Sol Ring\n2x Brainstorm\n1x Fable of the Mirror-Breaker'}
                    rows={10}
                    disabled={busy || loadingLink}
                    spellCheck={false}
                />

                {error && (
                    <div className="info-box info-box-error"><span>{error}</span></div>
                )}

                {busy && (
                    <div className="import-status">
                        <span className="import-spinner" />
                        Scarico immagini{progress.total ? ` ${progress.done}/${progress.total}` : '…'}
                    </div>
                )}

                {result && (
                    <div className="import-result">
                        <div>✓ {result.imported} immagini importate</div>
                        {result.notFound.length > 0 && (
                            <div className="import-notfound">
                                ✗ {result.notFound.length} non trovate: {result.notFound.join(', ')}
                            </div>
                        )}
                    </div>
                )}

                <div className="modal-actions">
                    {!result && (
                        <button className="btn-secondary" onClick={close} disabled={busy || loadingLink}>Chiudi</button>
                    )}
                    <button
                        className="btn-generate import-btn"
                        onClick={busy ? undefined : (result ? onClose : handleImport)}
                        disabled={busy || loadingLink || (!result && !text.trim())}
                    >
                        {busy ? <><span className="spinner" /> Import…</> : result ? 'Finito' : 'Importa'}
                    </button>
                </div>
            </div>
        </div>
    );
}
