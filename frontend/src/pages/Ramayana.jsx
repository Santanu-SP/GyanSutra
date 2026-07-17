import { Link } from 'react-router-dom';
import './TextReader.css'; // Reusing the same styles

const KANDAS = [
  { id: 1, name: 'Bala Kanda', sargas: 77, description: 'The childhood and youth of Rama.' },
  { id: 2, name: 'Ayodhya Kanda', sargas: 119, description: 'The royal court and the exile.' },
  { id: 3, name: 'Aranya Kanda', sargas: 75, description: 'Life in the forest and Sita\'s abduction.' },
  { id: 4, name: 'Kishkindha Kanda', sargas: 67, description: 'The alliance with the Vanara kingdom.' },
  { id: 5, name: 'Sundara Kanda', sargas: 68, description: 'Hanuman\'s journey to Lanka.' },
  { id: 6, name: 'Yuddha Kanda', sargas: 128, description: 'The great war and the victory of Dharma.' },
  { id: 7, name: 'Uttara Kanda', sargas: 111, description: 'The aftermath and final departure.' },
];

const ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII',
];

export default function Ramayana() {
  return (
    <main className="text-reader">
      <div className="text-reader__container">
        <Link to="/" className="text-reader__back">← Library</Link>
        <header className="text-reader__header">
          <p className="text-reader__source-badge">Sacred Scripture</p>
          <h1 className="text-reader__title">Valmiki Ramayana</h1>
          <p className="text-reader__devanagari devanagari">रामायण</p>
          <p className="text-reader__description">
            An epic text centered on dharma, exile, loyalty, and return.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-sarathi', { detail: { prompt: 'Ask a question about the Valmiki Ramayana' } }))}
              className="inline-flex items-center gap-2 rounded border border-amber-500/20 bg-amber-500/8 px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:border-amber-400/60 hover:text-[color:var(--accent)] transition"
              style={{ cursor: 'pointer' }}
            >
              <svg viewBox="0 0 20 20" fill="none" width="16" height="16" opacity="0.8">
                <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="currentColor" opacity="0.85"/>
              </svg>
              Consult Sarathi about Ramayana
            </button>
          </div>
        </header>

        <hr className="gold-rule" />

        <ol className="text-reader__chapter-list">
          {KANDAS.map((k, i) => (
            <li key={k.id} className="text-reader__chapter-item">
              <Link to={`/ramayana/${k.id}`} className="text-reader__chapter-row group">
                <span className="text-reader__roman" aria-hidden="true">
                  {ROMAN[i]}
                </span>
                <div className="text-reader__chapter-info">
                  <span className="text-reader__chapter-english">{k.name}</span>
                  <span className="text-reader__chapter-summary">{k.description}</span>
                </div>
                <div className="text-reader__chapter-meta">
                  <span className="text-reader__verse-count">{k.sargas} sargas</span>
                  <span className="text-reader__arrow" aria-hidden="true">
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
