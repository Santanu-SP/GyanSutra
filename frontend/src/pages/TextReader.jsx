import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSourceVerses, getSources } from '../services/api';

export default function TextReader() {
  const { source_id } = useParams();
  const [source, setSource] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    Promise.all([getSources(), getSourceVerses(source_id)])
      .then(([sources, versesResponse]) => {
        setSource(sources.find((item) => item.id === source_id) || null);
        setVerses(versesResponse.verses || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [source_id]);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <Link to="/" style={{ display: 'inline-block', marginBottom: 16 }}>
        Back to library
      </Link>

      <h1>Thread of knowledge from {source?.title}</h1>

      {loading ? <p>Loading...</p> : null}
      {error ? <p>{error}</p> : null}
      {!loading && !error && verses.length === 0 ? <p>No verses found.</p> : null}

      <section style={{ display: 'grid', gap: 12 }}>
        {verses.map((verse) => (
          <article
            key={verse.id}
            style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16 }}
          >
            <p style={{ marginTop: 0, fontWeight: 600 }}>
              Chapter {verse.chapterNumber}, Verse {verse.verseNumber}
            </p>
            {verse.sanskrit ? <p>{verse.sanskrit}</p> : null}
            {verse.translationEnglish ? <p style={{ marginBottom: 0 }}>{verse.translationEnglish}</p> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
