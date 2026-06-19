import { useState, useCallback, useRef, useEffect } from 'react';
import './index.css';
import { useDropzone } from 'react-dropzone';
import PageSettings from './components/PageSettings';
import PagePreview from './components/PagePreview';
import ScryfallImportModal from './components/ScryfallImportModal';
import { generatePDF, getGridInfo } from './utils/pdfGenerator';
import { IconFile, IconAlert, IconLayout, IconTrash } from './components/icons';

export default function App() {
  const [images, setImages] = useState([]);
  const [formatKey, setFormatKey] = useState('A3');
  const [bleedMm, setBleedMm] = useState(2);
  const [bleedStyle, setBleedStyle] = useState('auto'); // auto | mirror | stretch | black
  const [dpi, setDpi] = useState(600);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const { perPage } = getGridInfo(formatKey, bleedMm);

  // Revoca gli object URL residui allo smontaggio (evita leak di memoria).
  // imagesRef tiene il riferimento aggiornato senza ri-registrare l'effect.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => {
    imagesRef.current.forEach(i => URL.revokeObjectURL(i.preview));
  }, []);

  // Crea gli item immagine. entries: [{file, bleedMode}].
  const addItems = useCallback((entries) => {
    const newItems = entries.map(({ file, bleedMode }) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      bleedMode: bleedMode || 'none', // 'stretch'/'mirror' per Scryfall, 'none' per upload
    }));
    setImages(prev => [...prev, ...newItems]);
    setError(null);
  }, []);

  // Upload manuali (drag&drop / file picker): nessuna abbondanza generata.
  const handleImagesAdded = useCallback(
    (files) => addItems(files.map(file => ({ file, bleedMode: 'none' }))),
    [addItems],
  );

  // Import Scryfall: items già [{file, bleedMode}] con la modalità per carta.
  const handleScryfallImport = useCallback((items) => addItems(items), [addItems]);

  const handleRemove = useCallback((id) => {
    setImages(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    images.forEach(i => URL.revokeObjectURL(i.preview));
    setImages([]);
  }, [images]);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      await generatePDF(images.map(i => ({ file: i.file, bleedMode: i.bleedMode })), formatKey, bleedMm, dpi, bleedStyle);
    } catch (err) {
      setError(err.message || 'Errore durante la generazione del PDF.');
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
        <span className="logo-icon"><IconLayout size={20} /></span>
        <h1>ImpaginaProxies</h1>
        <span className="tagline">Impagina proxy per la stampa</span>
      </header>

      {/* ── Body ── */}
      <div className="app-body">

        {/* Sidebar */}
        <aside className="sidebar">
          <PageSettings
            formatKey={formatKey}
            setFormatKey={setFormatKey}
            bleedMm={bleedMm}
            setBleedMm={setBleedMm}
            bleedStyle={bleedStyle}
            setBleedStyle={setBleedStyle}
            dpi={dpi}
            setDpi={setDpi}
          />
          <div className="sidebar-section">
            <h2>Esporta</h2>
            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={images.length === 0 || loading}
            >
              {loading
                ? <><span className="spinner" /> Generazione…</>
                : <><IconFile size={18} /> Genera PDF</>
              }
            </button>
            {images.length > 0 && (
              <button className="btn-secondary" onClick={handleClearAll}>
                <IconTrash size={15} /> Elimina tutte
              </button>
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
            onRemove={handleRemove}
            onAddPhotos={open}
            onImportScryfall={() => setImportOpen(true)}
            isDragActive={isDragActive}
            missing={missing}
          />
        </main>
      </div>

      <ScryfallImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleScryfallImport}
      />
    </div>
  );
}
