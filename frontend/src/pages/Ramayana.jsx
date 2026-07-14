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
