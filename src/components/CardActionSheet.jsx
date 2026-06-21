import { IconImage, IconFrame, IconCopy, IconX } from './icons';

// Sheet azioni per una carta selezionata (mobile tap).
// card: oggetto immagine con id e bleedMode; onClose chiude il sheet.
export default function CardActionSheet({ card, onClose, onChangeArt, onDuplicate, onToggleBleed, onRemove }) {
  if (!card) return null;
  const act = (fn) => () => { fn(card.id); onClose(); };
  const bleedOn = card.bleedMode !== 'none';
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="menu" aria-label="Card actions">
        <div className="sheet-handle" />
        <button role="menuitem" onClick={act(onChangeArt)}><span className="sheet-ic"><IconImage size={18} /></span> Change art</button>
        <button role="menuitem" onClick={act(onDuplicate)}><span className="sheet-ic"><IconCopy size={18} /></span> Duplicate</button>
        <button role="menuitem" onClick={act(onToggleBleed)}><span className="sheet-ic"><IconFrame size={18} /></span> {bleedOn ? 'Remove bleed' : 'Generate bleed'}</button>
        <button role="menuitem" className="sheet-danger" onClick={act(onRemove)}><span className="sheet-ic"><IconX size={18} /></span> Remove</button>
      </div>
    </div>
  );
}
