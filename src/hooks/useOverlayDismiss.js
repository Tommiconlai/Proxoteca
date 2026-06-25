import { useEffect, useRef } from 'react';

// Esc per chiudere + gestione focus per overlay (modali, sheet, dialog).
// - Escape → onClose (capturato a livello documento).
// - Al "apri" sposta il focus dentro l'overlay (sul contenitore tabIndex=-1).
// - Alla chiusura ripristina il focus all'elemento che l'aveva (il trigger).
// `active` = se l'overlay è aperto (per i componenti sempre montati che fanno
// `if (!open) return null`: passa il flag, non si possono chiamare hook dopo il return).
// `focusContainer` = false per non rubare un autoFocus interno (es. ConfirmDialog
// mette il focus su Annulla, l'azione meno distruttiva).
// ponytail: niente focus-trap completo sul Tab; Esc + focus-in + restore coprono
// il grosso. Aggiungere il trap se un audit lo richiede.
export function useOverlayDismiss(onClose, active = true, { focusContainer = true } = {}) {
    const ref = useRef(null);
    // Ref "ultima versione" della callback, aggiornata in effect (non in render:
    // la regola react-hooks/refs vieta la scrittura del ref durante il render).
    const cb = useRef(onClose);
    useEffect(() => { cb.current = onClose; });

    useEffect(() => {
        if (!active) return undefined;
        const prev = document.activeElement;
        const onKey = (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); cb.current?.(); }
        };
        document.addEventListener('keydown', onKey);
        if (focusContainer) ref.current?.focus?.();
        return () => {
            document.removeEventListener('keydown', onKey);
            if (prev && prev.focus && document.contains(prev)) prev.focus();
        };
    }, [active, focusContainer]);

    return ref;
}
