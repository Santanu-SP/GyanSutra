/**
 * RecommendationsRail - "Related teachings" section.
 * Horizontal scroll on mobile, sidebar-style on desktop.
 * Reuses IlluminatedVerseCard (compact variant).
 */

import { useState, useEffect } from 'react';
import { getRecommendations } from '../services/api';
import IlluminatedVerseCard from './IlluminatedVerseCard';
import useLanguage from '../i18n/useLanguage';
import './RecommendationsRail.css';

export default function RecommendationsRail({ contentId, type = 'verse' }) {
  const { language } = useLanguage();
  const heading = ({ en: 'Related Teachings', hi: 'संबंधित शिक्षाएँ', bn: 'সম্পর্কিত শিক্ষা', mr: 'संबंधित शिकवणी', te: 'సంబంధిత బోధనలు', ta: 'தொடர்புடைய போதனைகள்' })[language];
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contentId) return;
    setLoading(true);
    setError(null);

    getRecommendations(contentId, type)
      .then((data) => {
        setRecs(data.recommendations || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [contentId, type]);

  if (loading) {
    return (
      <aside className="reco-rail" aria-label={heading}>
        <h3 className="reco-rail__heading">{heading}</h3>
        <div className="reco-rail__skeleton">
          {[1, 2, 3].map(i => (
            <div key={i} className="reco-rail__skeleton-card" aria-hidden="true" />
          ))}
        </div>
      </aside>
    );
  }

  if (error || recs.length === 0) return null; // Fail silently - don't break the page

  return (
    <aside className="reco-rail" aria-label={heading}>
      <div className="reco-rail__header">
        <hr className="gold-rule" />
        <h3 className="reco-rail__heading">{heading}</h3>
      </div>
      <div className="reco-rail__list" role="list">
        {recs.map((verse) => (
          <div key={verse.id} className="reco-rail__item" role="listitem">
            <IlluminatedVerseCard
              verse={verse}
              variant="compact"
              similarity={verse.similarity}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}
