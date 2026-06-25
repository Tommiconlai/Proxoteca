import { IconImage, IconFrame, IconCopy, IconX } from './icons';
import { bleedLabel } from '../utils/pdfGenerator';
import { useOverlayDismiss } from '../hooks/useOverlayDismiss';

// Sheet azioni per una carta selezionata (mobile tap).
// card: oggetto immagine con id e bleedMode; onClose chiude il sheet.
export default function CardActionSheet({ card, onClose, onChangeArt, onDuplicate, onToggleBleed, onRemove }) {
  const dismissRef = useOverlayDismiss(onClose, !!card); // Esc chiude + focus nello sheet
  if (!card) return null;
  const act = (fn) => () => { fn(card.id); onClose(); };
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" ref={dismissRef} tabIndex={-1} onClick={(e) => e.stopPropagation()} role="menu" aria-label="Card actions">
        <div className="sheet-handle" />
        <button role="menuitem" onClick={act(onChangeArt)}><span className="sheet-ic"><IconImage size={18} /></span> Change art</button>
        <button role="menuitem" onClick={act(onDuplicate)}><span className="sheet-ic"><IconCopy size={18} /></span> Duplicate</button>
        {/* Cicla il modo abbondanza senza chiudere lo sheet (così si scorrono gli stati) */}
        <button role="menuitem" onClick={() => onToggleBleed(card.id)}><span className="sheet-ic"><IconFrame size={18} /></span> Bleed: {bleedLabel(card.bleedMode)}</button>
        <button role="menuitem" className="sheet-danger" onClick={act(onRemove)}><span className="sheet-ic"><IconX size={18} /></span> Remove</button>
      </div>
    </div>
  );
}
