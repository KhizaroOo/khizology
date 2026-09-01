import { useState } from 'react';
import Warning from '../shared/Warning';
import Metric from '../shared/Metric';
import { loadImageFromFile, type LoadedImage } from '../shared/loadImage';

const SIZES: Record<string, [number, number]> = {
  'Letter (8.5×11")': [8.5, 11],
  'A4 (8.27×11.69")': [8.27, 11.69],
  'Photo 4×6"': [4, 6],
  'Photo 5×7"': [5, 7],
  'Photo 8×10"': [8, 10],
};

const PRINT_FRIENDLY_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export default function PrintReadyDoctor() {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sizeKey, setSizeKey] = useState('Letter (8.5×11")');

  const handleFile = async (file: File) => {
    try {
      setImg(await loadImageFromFile(file));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setImg(null);
    }
  };

  const [pw, ph] = SIZES[sizeKey];
  const dpi = img ? Math.min(img.width / pw, img.height / ph) : 0;
  const formatOk = img ? PRINT_FRIENDLY_TYPES.includes(img.mimeType) : true;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--k-text)', marginTop: 0, marginBottom: '1rem' }}>
        Upload your document or photo
      </h2>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        style={{ fontSize: '.85rem', color: 'var(--k-text)', marginBottom: '1.25rem' }}
      />

      {error && <Warning level="danger" title="Couldn't read this file">{error}</Warning>}

      {img && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 700, color: 'var(--k-text-muted)', marginBottom: '.375rem', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Target print size
            </label>
            <select
              value={sizeKey}
              onChange={(e) => setSizeKey(e.target.value)}
              style={{ width: '100%', maxWidth: '280px', padding: '.6rem .875rem', borderRadius: '.5rem', border: '1.5px solid var(--k-border)', background: 'var(--k-bg)', color: 'var(--k-text)', fontSize: '.9rem', fontFamily: "'Mulish', sans-serif" }}
            >
              {Object.keys(SIZES).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
            <Metric label="Image size" value={`${img.width} × ${img.height}px`} />
            <Metric label="DPI at this size" value={`${Math.round(dpi)}`} color={dpi >= 300 ? '#22c55e' : dpi >= 150 ? '#F7933C' : '#ef4444'} />
            <Metric label="Format" value={img.mimeType.split('/')[1]?.toUpperCase() ?? 'unknown'} color={formatOk ? '#22c55e' : '#F7933C'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.625rem' }}>
            {dpi >= 300 ? (
              <Warning level="good" title={`${Math.round(dpi)} DPI — print-shop quality`} />
            ) : dpi >= 150 ? (
              <Warning level="warn" title={`${Math.round(dpi)} DPI — usable, but not crisp`}>
                Home/office printers will look fine; a professional print shop may flag this as soft. Standard target is 300 DPI.
              </Warning>
            ) : (
              <Warning level="danger" title={`${Math.round(dpi)} DPI — will look pixelated at ${sizeKey}`}>
                Choose a smaller print size or use a higher-resolution file.
              </Warning>
            )}

            {!formatOk && (
              <Warning level="warn" title="Uncommon format for print">
                Many print shops expect JPEG, PNG, or PDF. Convert this file before sending it to print.
              </Warning>
            )}

            <Warning level="info" title="Margins &amp; safe area (general guidance)">
              This tool can't detect your actual margins from the file — as a rule of thumb, keep important content at least 0.25"–0.5" from every edge, and add extra bleed if the design runs to the paper's edge.
            </Warning>
          </div>
        </>
      )}
    </div>
  );
}
