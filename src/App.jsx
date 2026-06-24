import { useState, useRef, useEffect } from 'react';
import './index.css';
import { useDropzone } from 'react-dropzone';
import PageSettings from './components/PageSettings';
import PagePreview from './components/PagePreview';
import ScryfallImportModal from './components/ScryfallImportModal';
import MpcImportModal from './components/MpcImportModal';
import ArtPickerModal from './components/ArtPickerModal';
import CookieBanner from './components/CookieBanner';
import MobileLayout from './components/MobileLayout';
import { useIsMobile } from './hooks/useIsMobile';
import { generatePDF, getGridInfo, PAPER_FORMATS, nextBleedMode } from './utils/pdfGenerator';
import { buildDeckList } from './utils/scryfall';
import { IconFile, IconAlert, IconTrash, IconDownload, IconImage, IconPlus, Logo } from './components/icons';

// Lettura numerica da localStorage con default (null/NaN → default, 0 valido).
const readNum = (k, d) => {
  const s = localStorage.getItem(k);
  const v = Number(s);
  return s !== null && Number.isFinite(v) ? v : d;
};

export default function App() {
  const [images, setImages] = useState([]);
  const [formatKey, setFormatKey] = useState(() => {
    const s = localStorage.getItem('ip:format');
    return s && (PAPER_FORMATS[s] || s === 'custom') ? s : 'A3';
  });
  const [bleedMm, setBleedMm] = useState(() => readNum('ip:bleed', 2));
  const [bleedStyle, setBleedStyle] = useState(() => localStorage.getItem('ip:bleedStyle') || 'auto'); // auto | mirror | stretch | black
  const [dpi, setDpi] = useState(() => readNum('ip:dpi', 600));
  const [cardType, setCardType] = useState(() => localStorage.getItem('ip:cardType') || 'mtg');
  const [cardW, setCardW] = useState(() => readNum('ip:cardW', 63) || 63);
  const [cardH, setCardH] = useState(() => readNum('ip:cardH', 88) || 88);
  const [cropMarks, setCropMarks] = useState(() => localStorage.getItem('ip:cropMarks') !== '0'); // default on
  const [cropStyle, setCropStyle] = useState(() => localStorage.getItem('ip:cropStyle') || 'lines'); // lines | corners
  const [sheetUnit, setSheetUnit] = useState(() => (localStorage.getItem('ip:sheetUnit') === 'in' ? 'in' : 'mm'));
  const [sheetW, setSheetW] = useState(() => readNum('ip:sheetW', 210) || 210);
  const [sheetH, setSheetH] = useState(() => readNum('ip:sheetH', 297) || 297);
  // Output: 'rgb' (jsPDF, schermo) | 'cmyk' (PDF/X-1a, stampa). Il profilo ICC NON
  // è persistito (binario; si ri-carica a sessione, come le immagini).
  const [colorMode, setColorMode] = useState(() => (localStorage.getItem('ip:colorMode') === 'cmyk' ? 'cmyk' : 'rgb'));
  const [renderIntent, setRenderIntent] = useState(() => (localStorage.getItem('ip:renderIntent') === 'perceptual' ? 'perceptual' : 'relative'));
  const [iccProfile, setIccProfile] = useState(null); // { bytes:Uint8Array, name, space }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [mpcOpen, setMpcOpen] = useState(false); // import da file XML MPCFill
  const [addMenuOpen, setAddMenuOpen] = useState(false); // menu "+" in sidebar (carica file / Scryfall)
  const [helpOpen, setHelpOpen] = useState(false); // tooltip "?" header (apri al click, non hover)
  const [editingId, setEditingId] = useState(null); // carta di cui cambiare l'art
  // Foglio personalizzato in mm (sheetW/H sono nell'unità scelta: mm o inch).
  const customSheet = formatKey === 'custom'
    ? (sheetUnit === 'in' ? [sheetW * 25.4, sheetH * 25.4] : [sheetW, sheetH])
    : null;
  const { perPage } = getGridInfo(formatKey, bleedMm, cardW, cardH, customSheet);
  const editing = editingId ? images.find(i => i.id === editingId) : null;

  // Persiste i settaggi (non le immagini: sono blob, si re-importano in 1 click).
  useEffect(() => {
    localStorage.setItem('ip:format', formatKey);
    localStorage.setItem('ip:bleed', String(bleedMm));
    localStorage.setItem('ip:bleedStyle', bleedStyle);
    localStorage.setItem('ip:dpi', String(dpi));
    localStorage.setItem('ip:cardType', cardType);
    localStorage.setItem('ip:cardW', String(cardW));
    localStorage.setItem('ip:cardH', String(cardH));
    localStorage.setItem('ip:cropMarks', cropMarks ? '1' : '0');
    localStorage.setItem('ip:cropStyle', cropStyle);
    localStorage.setItem('ip:sheetUnit', sheetUnit);
    localStorage.setItem('ip:sheetW', String(sheetW));
    localStorage.setItem('ip:sheetH', String(sheetH));
    localStorage.setItem('ip:colorMode', colorMode);
    localStorage.setItem('ip:renderIntent', renderIntent);
  }, [formatKey, bleedMm, bleedStyle, dpi, cardType, cardW, cardH, cropMarks, cropStyle, sheetUnit, sheetW, sheetH, colorMode, renderIntent]);

  // Revoca gli object URL residui allo smontaggio (evita leak di memoria).
  // imagesRef tiene il riferimento aggiornato senza ri-registrare l'effect.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => {
    imagesRef.current.forEach(i => URL.revokeObjectURL(i.preview));
  }, []);

  // Chiude il menu "+" della sidebar al click fuori
  const addMenuRef = useRef(null);
  useEffect(() => {
    if (!addMenuOpen) return;
    const onDoc = (e) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [addMenuOpen]);

  // Chiude il tooltip "?" al click fuori
  const helpRef = useRef(null);
  useEffect(() => {
    if (!helpOpen) return;
    const onDoc = (e) => { if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [helpOpen]);

  // Crea gli item immagine. entries: [{file, bleedMode}].
  const addItems = (entries) => {
    const newItems = entries.map(({ file, bleedMode, name, set, collector, primary }) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      bleedMode: bleedMode || 'none', // 'stretch'/'mirror' per Scryfall, 'none' per upload
      name, set, collector, primary,  // metadati Scryfall per il salvataggio (undefined sugli upload manuali)
    }));
    setImages(prev => [...prev, ...newItems]);
    setError(null);
    // Decodifica la larghezza nativa (per l'avviso bassa risoluzione vs DPI scelto)
    newItems.forEach((it) => {
      const probe = new Image();
      probe.onload = () => setImages(prev => prev.map(p => (p.id === it.id ? { ...p, w: probe.naturalWidth } : p)));
      probe.src = it.preview;
    });
  };

  // Upload manuali (drag&drop / file picker): nessuna abbondanza generata.
  // Upload manuali: nessuna abbondanza generata (carta a misura di taglio).
  // Per le carte già al vivo: Bleed style → "Bleed in art", o il toggle per-carta.
  const handleImagesAdded = (files) => addItems(files.map(file => ({ file, bleedMode: 'none' })));

  const handleRemove = (id) => {
    setImages(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleClearAll = () => {
    images.forEach(i => URL.revokeObjectURL(i.preview));
    setImages([]);
  };

  // Abbondanza on/off per carta: none ↔ stretch. Lo stile globale può poi forzare
  // mirror/black sulle carte che hanno abbondanza. Utile sugli upload manuali.
  // Cambia il modo abbondanza per-carta dopo l'upload, ciclando i 3 stati:
  // none → stretch (genera) → full (già nell'art) → none. Permette di marcare/
  // smarcare una carta come "già con abbondanza" anche se caricata diversamente.
  const handleToggleBleed = (id) => setImages(prev => prev.map(it =>
    it.id === id ? { ...it, bleedMode: nextBleedMode(it.bleedMode) } : it,
  ));

  // Duplica una carta (preview con object URL nuovo, inserita dopo l'originale).
  const handleDuplicate = (id) => setImages(prev => {
    const idx = prev.findIndex(i => i.id === id);
    if (idx === -1) return prev;
    const it = prev[idx];
    const dup = { ...it, id: `${it.file.name}-${Date.now()}-${Math.random()}`, preview: URL.createObjectURL(it.file) };
    return [...prev.slice(0, idx + 1), dup, ...prev.slice(idx + 1)];
  });

  // Cambia art: il box ha già scaricato la stampa Scryfall; sostituisce file+preview
  // (id invariato). meta: { bleedMode, set, collector } — bleedMode mirror/stretch in
  // base a full-art/borderless; set/collector aggiornati così "Save list" segue la stampa.
  const handleReplaceArt = (file, { bleedMode, set, collector } = {}) => {
    const preview = URL.createObjectURL(file);
    setImages(prev => prev.map(it => {
      if (it.id !== editingId) return it;
      URL.revokeObjectURL(it.preview);
      return {
        ...it, file, preview,
        bleedMode: bleedMode != null ? bleedMode : it.bleedMode,
        // set lowercase (coerenza con l'import); collector mantiene il case (Scryfall
        // è case-sensitive).
        set: set != null ? set.toLowerCase() : it.set,
        collector: collector != null ? collector : it.collector,
      };
    }));
    setEditingId(null);
  };

  // Salva la lista delle carte Scryfall in un .txt (formato deck-list → ricaricabile
  // incollandola in "Importa da Scryfall"). Gli upload manuali non entrano nel testo.
  const handleSaveProject = () => {
    setError(null); setNotice(null);
    const { text, cards, custom } = buildDeckList(images);
    if (!cards) {
      setError(custom
        ? 'Only custom images — project save covers Scryfall cards only.'
        : 'No cards to save.');
      return;
    }
    const blob = new Blob([text + '\n'], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'proxoteca.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice(custom
      ? `Saved ${cards} Scryfall card${cards > 1 ? 's' : ''}. ${custom} custom image${custom > 1 ? 's' : ''} not included (text can't store images).`
      : `Saved ${cards} Scryfall card${cards > 1 ? 's' : ''} to proxoteca.txt.`);
  };

  // Carica + valida un profilo ICC CMYK (.icc). Non persistito (binario).
  const handleIccUpload = async (file) => {
    if (!file) return;
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { readProfileInfo } = await import('./utils/cmykEngine');
      const info = await readProfileInfo(bytes);
      if (info.space !== 'CMYK') throw new Error('That ICC profile is not a CMYK profile.');
      setIccProfile({ bytes, name: info.name || file.name, space: info.space });
    } catch (err) {
      setIccProfile(null);
      setError(err.message || 'Could not read the ICC profile.');
    }
  };
  const handleIccClear = () => setIccProfile(null);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      if (colorMode === 'cmyk') {
        if (!iccProfile) throw new Error('Load the print shop ICC profile first (CMYK output).');
        const { generatePDFCmyk } = await import('./utils/pdfGeneratorCmyk');
        await generatePDFCmyk(images, formatKey, bleedMm, dpi, bleedStyle, cardW, cardH, cropMarks, cropStyle, customSheet, iccProfile.bytes, iccProfile.name, renderIntent);
      } else {
        await generatePDF(images, formatKey, bleedMm, dpi, bleedStyle, cardW, cardH, cropMarks, cropStyle, customSheet);
      }
    } catch (err) {
      setError(err.message || 'Error generating the PDF.');
    } finally {
      setLoading(false);
    }
  };

  // Dropzone: drag&drop sull'intera area preview + open() per il bottone "+".
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    onDrop: (accepted) => { if (accepted.length > 0) handleImagesAdded(accepted); },
    noClick: true,
    noKeyboard: true,
  });

  const missing = images.length === 0 || perPage === 0 ? 0 : (perPage - (images.length % perPage)) % perPage;
  // Carte la cui sorgente non regge il DPI scelto — stessa soglia del marker "!" nel preview.
  const lowResCount = images.reduce((n, it) => n + (it.w && it.w < dpi * 0.5 * (cardW / 25.4) ? 1 : 0), 0);

  const isMobile = useIsMobile();

  // Bundle props condivisi: sia il ramo desktop sia MobileLayout (Tasks 2–4) li consumano.
  const settingsProps = {
    formatKey, setFormatKey, bleedMm, setBleedMm, bleedStyle, setBleedStyle, dpi, setDpi,
    cardType, setCardType, cardW, setCardW, cardH, setCardH, cropMarks, setCropMarks,
    cropStyle, setCropStyle, sheetUnit, setSheetUnit, sheetW, setSheetW, sheetH, setSheetH,
    customSheet, lowResCount,
    colorMode, setColorMode, renderIntent, setRenderIntent,
    iccProfile, onIccUpload: handleIccUpload, onIccClear: handleIccClear,
  };
  const previewProps = {
    images, formatKey, bleedMm, bleedStyle, dpi, cardW, cardH, showCrop: cropMarks, cropStyle,
    customSheet, onRemove: handleRemove, onChangeArt: setEditingId, onToggleBleed: handleToggleBleed,
    onDuplicate: handleDuplicate, isDragActive, missing,
  };

  // Ramo mobile: shell a tab + modali condivise (props reali arrivano in Tasks 2–4).
  if (isMobile) {
    return (
      <>
        <MobileLayout
          settingsProps={settingsProps}
          previewProps={previewProps}
          actions={{ onGenerate: handleGenerate, onSave: handleSaveProject, onClear: handleClearAll,
            loading, error, notice, count: images.length, missing, lowResCount, dpi }}
          addMenu={{ onUpload: open, onImport: () => setImportOpen(true), onImportMpc: () => setMpcOpen(true) }}
        />
        <ScryfallImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={addItems} />
        <MpcImportModal open={mpcOpen} onClose={() => setMpcOpen(false)} onImport={addItems} />
        {editing && <ArtPickerModal key={editing.id} card={editing} onClose={() => setEditingId(null)} onPick={handleReplaceArt} />}
        <CookieBanner />
      </>
    );
  }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <Logo size={34} className="logo-mark" />
        <h1>Proxoteca</h1>
        <div className={`help${helpOpen ? ' open' : ''}`} ref={helpRef}>
          <button type="button" className="help-btn" aria-label="How it works"
            aria-haspopup="dialog" aria-expanded={helpOpen}
            onClick={() => setHelpOpen((o) => !o)}>?</button>
          <div className="help-tooltip" role="tooltip">
            <strong>How it works</strong>
            <ol>
              <li><b>Add cards</b> — upload images, or import from Scryfall (paste a card list or a deck link).</li>
              <li><b>Set up</b> — sheet &amp; card size, bleed and crop marks in the sidebar.</li>
              <li><b>Tweak</b> — click a card to change its printing; hover a card to duplicate, toggle bleed, or remove it.</li>
              <li><b>Export</b> — <b>Generate PDF</b> (print-ready). <b>Save list</b> exports your Scryfall cards as a reloadable deck list.</li>
            </ol>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="app-body">

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-scroll">
          <PageSettings {...settingsProps} />
          </div>
          <div className="sidebar-section sidebar-export">
            <div className="add-menu-wrap" ref={addMenuRef}>
              {addMenuOpen && (
                <div className="add-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); open(); }}>
                    <IconImage size={15} /> Upload files
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); setImportOpen(true); }}>
                    <IconDownload size={15} /> Import from Scryfall
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); setMpcOpen(true); }}>
                    <IconFile size={15} /> Import from MPCFill
                  </button>
                </div>
              )}
              <button
                type="button"
                className={`btn-add${addMenuOpen ? ' open' : ''}`}
                onClick={() => setAddMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={addMenuOpen}
              >
                <IconPlus size={18} /> Add cards
              </button>
            </div>
            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={images.length === 0 || loading}
            >
              {loading
                ? <><span className="spinner" /> Generating…</>
                : <><IconFile size={18} /> Generate PDF</>
              }
            </button>
            <div className="export-row">
              <button className="btn-secondary btn-save" onClick={handleSaveProject} disabled={images.length === 0}>
                <IconDownload size={15} /> Save list
              </button>
              <button className="btn-secondary" onClick={handleClearAll} disabled={images.length === 0}>
                <IconTrash size={15} /> Delete all
              </button>
            </div>
            {notice && (
              <div className="info-box"><span>{notice}</span></div>
            )}
            {error && (
              <div className="info-box info-box-error">
                <IconAlert size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </aside>

        {/* Main — area drop + preview grande */}
        <main className="main-content" {...getRootProps()}>
          <input {...getInputProps()} />
          <PagePreview {...previewProps} />
        </main>
      </div>

      <ScryfallImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={addItems}
      />

      <MpcImportModal open={mpcOpen} onClose={() => setMpcOpen(false)} onImport={addItems} />

      {editing && (
        <ArtPickerModal
          key={editing.id}
          card={editing}
          onClose={() => setEditingId(null)}
          onPick={handleReplaceArt}
        />
      )}

      <CookieBanner />
    </div>
  );
}
