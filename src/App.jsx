import { useState, useRef, useEffect } from 'react';
import './index.css';
import { useDropzone } from 'react-dropzone';
import PageSettings from './components/PageSettings';
import PagePreview from './components/PagePreview';
import ScryfallImportModal from './components/ScryfallImportModal';
import ArtPickerModal from './components/ArtPickerModal';
import { generatePDF, getGridInfo, PAPER_FORMATS } from './utils/pdfGenerator';
import { downloadAsFile, buildDeckList } from './utils/scryfall';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false); // menu "+" in sidebar (carica file / Scryfall)
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
  }, [formatKey, bleedMm, bleedStyle, dpi, cardType, cardW, cardH, cropMarks, cropStyle, sheetUnit, sheetW, sheetH]);

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
  };

  // Upload manuali (drag&drop / file picker): nessuna abbondanza generata.
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
  const handleToggleBleed = (id) => setImages(prev => prev.map(it =>
    it.id === id ? { ...it, bleedMode: it.bleedMode === 'none' ? 'stretch' : 'none' } : it,
  ));

  // Duplica una carta (preview con object URL nuovo, inserita dopo l'originale).
  const handleDuplicate = (id) => setImages(prev => {
    const idx = prev.findIndex(i => i.id === id);
    if (idx === -1) return prev;
    const it = prev[idx];
    const dup = { ...it, id: `${it.file.name}-${Date.now()}-${Math.random()}`, preview: URL.createObjectURL(it.file) };
    return [...prev.slice(0, idx + 1), dup, ...prev.slice(idx + 1)];
  });

  // Cambia art: scarica la stampa scelta e sostituisce file+preview (id/bleedMode invariati).
  const handleReplaceArt = async (png, name, set, collector) => {
    const file = await downloadAsFile(png, name);
    const preview = URL.createObjectURL(file);
    setImages(prev => prev.map(it => {
      if (it.id !== editingId) return it;
      URL.revokeObjectURL(it.preview);
      // Aggiorna l'edizione così il salvataggio segue la stampa scelta (set lowercase
      // per coerenza con l'import; collector mantiene il case — Scryfall è case-sensitive).
      return { ...it, file, preview, set: set != null ? set.toLowerCase() : it.set, collector: collector != null ? collector : it.collector };
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

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      await generatePDF(images, formatKey, bleedMm, dpi, bleedStyle, cardW, cardH, cropMarks, cropStyle, customSheet);
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

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <Logo size={34} className="logo-mark" />
        <h1>Proxoteca</h1>
        <span className="tagline">Lay out card proxies for printing</span>
      </header>

      {/* ── Body ── */}
      <div className="app-body">

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-scroll">
          <PageSettings
            formatKey={formatKey}
            setFormatKey={setFormatKey}
            bleedMm={bleedMm}
            setBleedMm={setBleedMm}
            bleedStyle={bleedStyle}
            setBleedStyle={setBleedStyle}
            dpi={dpi}
            setDpi={setDpi}
            cardType={cardType}
            setCardType={setCardType}
            cardW={cardW}
            setCardW={setCardW}
            cardH={cardH}
            setCardH={setCardH}
            cropMarks={cropMarks}
            setCropMarks={setCropMarks}
            cropStyle={cropStyle}
            setCropStyle={setCropStyle}
            sheetUnit={sheetUnit}
            setSheetUnit={setSheetUnit}
            sheetW={sheetW}
            setSheetW={setSheetW}
            sheetH={sheetH}
            setSheetH={setSheetH}
            customSheet={customSheet}
          />
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
          <PagePreview
            images={images}
            formatKey={formatKey}
            bleedMm={bleedMm}
            bleedStyle={bleedStyle}
            dpi={dpi}
            cardW={cardW}
            cardH={cardH}
            showCrop={cropMarks}
            cropStyle={cropStyle}
            customSheet={customSheet}
            onRemove={handleRemove}
            onChangeArt={setEditingId}
            onToggleBleed={handleToggleBleed}
            onDuplicate={handleDuplicate}
            isDragActive={isDragActive}
            missing={missing}
          />
        </main>
      </div>

      <ScryfallImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={addItems}
      />

      {editing && (
        <ArtPickerModal
          key={editing.id}
          card={editing}
          onClose={() => setEditingId(null)}
          onPick={handleReplaceArt}
        />
      )}
    </div>
  );
}
