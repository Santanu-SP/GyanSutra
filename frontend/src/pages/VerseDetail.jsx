/**
 * VerseDetail — full single-verse page with recommendations.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVerse } from '../services/api';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import RecommendationsRail from '../components/RecommendationsRail';
import LoadingSpinner from '../components/LoadingSpinner';
import './VerseDetail.css';

export default function VerseDetail() {
  const { id } = useParams();
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getVerse(id)
      .then(setVerse)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (error) return (
    <main className="verse-detail">
      <Link to="/" className="verse-detail__back">← Home</Link>
      <p>Verse not found: {error}</p>
    </main>
  );

  const chapterId = verse ? `chapter_${verse.chapterNumber}` : null;

  return (
    <main className="verse-detail page-turn-enter">
      <nav className="verse-detail__breadcrumb" aria-label="Breadcrumb">
        <Link to="/" id="breadcrumb-home">Gyan Sutra</Link>
        {verse && (
          <>
            <span className="verse-detail__breadcrumb-sep">›</span>
            <Link to={`/chapters/${chapterId}`} id="breadcrumb-chapter">
              Chapter {verse.chapterNumber}
            </Link>
            <span className="verse-detail__breadcrumb-sep">›</span>
            <span>Verse {verse.verseNumber}</span>
          </>
        )}
      </nav>

      {loading ? (
        <LoadingSpinner size="medium" text="Loading Shloka..." />
      ) : verse ? (
        <>
          <IlluminatedVerseCard verse={verse} variant="full" />
          <RecommendationsRail contentId={verse.id} type="verse" />
        </>
      ) : (
        <p>Verse not available.</p>
      )}
    </main>
  );
}
