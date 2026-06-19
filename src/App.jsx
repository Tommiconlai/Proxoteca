import { useState, useCallback } from 'react';
import './index.css';
import ImageUploader from './components/ImageUploader';
import PageSettings from './components/PageSettings';
import PagePreview from './components/PagePreview';
import { generatePDF, getGridInfo } from './utils/pdfGenerator';
import { IconFile, IconTrash, IconAlert, IconLayout, IconX } from './components/icons';

export default function App() {
  const [images, setImages] = useState([]);
  const [formatKey, setFormatKey] = useState('A3');
  const [bleedMm, setBleedMm] = useState(2);
  const [dpi, setDpi] = useState(600);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { perPage } = getGridInfo(formatKey, bleedMm);

  const handleImagesAdded = useCallback((files) => {
    const newItems = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));
    setImages(prev => [...prev, ...newItems]);
    setError(null);
  }, []);

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
      await generatePDF(images.map(i => i.file), formatKey, bleedMm, dpi);
    } catch (err) {
      setError(err.message || 'Errore durante la generazione del PDF.');
    } finally {
      setLoading(false);
    }
  };

  const missing = images.length === 0 ? 0 : (perPage - (images.length % perPage)) % perPage;

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
            {error && (
              <div className="info-box info-box-error">
                <IconAlert size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="main-content">

          {/* ── Riga superiore: Uploader | Preview pagine ── */}
          <div className="upload-preview-row">
            {/* Drop zone compatta */}
            <div className="upload-column">
              <ImageUploader onImagesAdded={handleImagesAdded} />
            </div>

            {/* Preview pagine + layout vuoto */}
            <div className="preview-column">
              <PagePreview
                images={images}
                formatKey={formatKey}
                bleedMm={bleedMm}
              />
            </div>
          </div>

          {/* ── Riga inferiore: Thumbnails ── */}
          {images.length > 0 && (
            <div className="images-section">
              <div className="images-header">
                <h2>Immagini caricate</h2>
                <div className="images-actions">
                  <span className="badge">{images.length} img</span>
                  {missing > 0 && (
                    <span className="badge badge-warning">{missing} immagini mancanti</span>
                  )}
                  <button className="btn-secondary" onClick={handleClearAll}>
                    <IconTrash size={15} /> Elimina tutte
                  </button>
                </div>
              </div>
              <div className="image-list">
                {images.map((item) => (
                  <div key={item.id} className="image-list-row">
                    <span className="image-list-name" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <button
                      className="image-list-remove"
                      onClick={() => handleRemove(item.id)}
                      title="Rimuovi"
                      aria-label={`Rimuovi ${item.file.name}`}
                    ><IconX size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
