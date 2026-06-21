import { useState } from 'react';
import BottomTabBar from './BottomTabBar';
import { Logo, IconFile, IconDownload, IconTrash, IconPlus, IconImage } from './icons';
import PageSettings from './PageSettings';
import PagePreview from './PagePreview';
import CardActionSheet from './CardActionSheet';

export default function MobileLayout({ settingsProps, previewProps, actions, addMenu }) {
  const [tab, setTab] = useState('cards');
  const [addOpen, setAddOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="mobile">
      <header className="mobile-header">
        <Logo size={30} className="logo-mark" />
        <h1>Proxoteca</h1>
        {/* Pulsante ? con tap-toggle su mobile — riusa lo stesso markup del desktop */}
        <div className={`help${helpOpen ? ' open' : ''}`}>
          <button type="button" className="help-btn" aria-label="How it works" onClick={() => setHelpOpen((o) => !o)}>?</button>
          <div className="help-tooltip" role="tooltip">
            <strong>How it works</strong>
            <ol>
              <li><b>Add cards</b> — tap <b>＋</b> to upload images or import from Scryfall (a card list or a deck link).</li>
              <li><b>Set up</b> — sheet &amp; card size, bleed and crop marks in the <b>Settings</b> tab.</li>
              <li><b>Tweak</b> — tap a card to change art, duplicate, toggle bleed, or remove it.</li>
              <li><b>Export</b> — the <b>Export</b> tab: <b>Generate PDF</b> (print-ready); <b>Save list</b> exports your Scryfall cards as a reloadable deck list.</li>
            </ol>
          </div>
        </div>
      </header>
      <main className="mobile-body" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'cards' && (
          <div className="mobile-cards">
            <PagePreview {...previewProps} onCardTap={setSel} />
            <button className="fab" onClick={() => setAddOpen(true)} aria-label="Add cards"><IconPlus size={26} /></button>
            {addOpen && (
              <div className="sheet-overlay" onClick={() => setAddOpen(false)}>
                <div className="sheet" onClick={(e) => e.stopPropagation()} role="menu">
                  <div className="sheet-handle" />
                  <button role="menuitem" onClick={() => { setAddOpen(false); addMenu.onUpload(); }}><IconImage size={18} /> Upload files</button>
                  <button role="menuitem" onClick={() => { setAddOpen(false); addMenu.onImport(); }}><IconDownload size={18} /> Import from Scryfall</button>
                  <button role="menuitem" onClick={() => { setAddOpen(false); addMenu.onImportMpc(); }}><IconFile size={18} /> Import from MPCFill</button>
                </div>
              </div>
            )}
            <CardActionSheet
              card={previewProps.images.find((i) => i.id === sel) || null}
              onClose={() => setSel(null)}
              onChangeArt={previewProps.onChangeArt}
              onDuplicate={previewProps.onDuplicate}
              onToggleBleed={previewProps.onToggleBleed}
              onRemove={previewProps.onRemove}
            />
          </div>
        )}
        {tab === 'settings' && (
          <div className="mobile-settings"><PageSettings {...settingsProps} /></div>
        )}
        {tab === 'export' && (
          <div className="mobile-export">
            <div className="export-summary">
              <strong>{actions.count}</strong> card{actions.count !== 1 ? 's' : ''}
              {actions.missing > 0 && <span> · {actions.missing} to fill the page</span>}
            </div>
            {actions.lowResCount > 0 && (
              <div className="lowres-warn"><span className="lowres-mark" aria-hidden="true">!</span>
                <span>{actions.lowResCount} card{actions.lowResCount > 1 ? 's' : ''} too low-res for {actions.dpi} DPI — lower the DPI or use higher-res art.</span></div>
            )}
            <button className="btn-generate" onClick={actions.onGenerate} disabled={actions.count === 0 || actions.loading}>
              {actions.loading ? <><span className="spinner" /> Generating…</> : <><IconFile size={18} /> Generate PDF</>}
            </button>
            <div className="export-row">
              <button className="btn-secondary btn-save" onClick={actions.onSave} disabled={actions.count === 0}><IconDownload size={15} /> Save list</button>
              <button className="btn-secondary" onClick={actions.onClear} disabled={actions.count === 0}><IconTrash size={15} /> Delete all</button>
            </div>
            {actions.notice && <div className="info-box"><span>{actions.notice}</span></div>}
            {actions.error && <div className="info-box info-box-error"><span>{actions.error}</span></div>}
          </div>
        )}
      </main>
      <BottomTabBar active={tab} onChange={setTab} />
    </div>
  );
}
