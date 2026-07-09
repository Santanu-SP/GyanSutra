/**
 * Home — "Today's Verse" landing page.
 *
 * The homepage opens directly on today's verse as a full illuminated card.
 * No hero banner with buttons. No marketing copy.
 * "Today's verse" is deterministic: (day_index % total_verse_count).
 *
 * Below the verse: chapter navigation and a brief app description.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSources } from '../services/api';

export default function Home() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSources()
      .then((data) => setSources(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Gyan Sutra</h1>
        <p style={{ marginTop: 8 }}>Choose a text from the library.</p>
      </header>

      {error ? <p>{error}</p> : null}

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                style={{ border: '1px solid #ddd', borderRadius: 12, minHeight: 140, padding: 16 }}
              />
            ))
          : sources.map((source) => (
              <Link
                key={source.id}
                to={`/${source.id}`}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 12,
                  padding: 16,
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: '1.1rem' }}>{source.title}</h2>
                <p style={{ margin: 0 }}>{source.description}</p>
              </Link>
            ))}
      </section>
    </main>
  );
}
