/**
 * Search - full semantic search results page.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchVerses } from '../services/api';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedButton from '../components/AnimatedButton';
import useLanguage from '../i18n/useLanguage';

import './Search.css';

const SEARCH_COPY = {
  en: { title: 'Search Scriptures', placeholder: 'Search by topic, phrase, or keyword', all: 'All Texts', searching: 'Searching scriptures…', none: 'No verses found for', hint: 'Try a broader phrase, such as “duty”, “soul”, or “peace of mind”.', orAsk: 'Or ask Sarathi directly about this idea:', failed: 'Search could not be completed. Please try again.', match: 'matching', ordered: 'ordered by relevance', idle: 'Search for an idea, a phrase, or a question from the texts.', suggestions: ['What is the nature of the soul?', 'How to find peace?', 'What is duty?', 'Liberation from sorrow'] },
  hi: { title: 'शास्त्रों में खोजें', placeholder: 'विषय, वाक्यांश या शब्द खोजें', all: 'सभी ग्रंथ', searching: 'शास्त्रों में खोज रहा है…', none: 'कोई श्लोक नहीं मिला:', hint: '“कर्तव्य”, “आत्मा” या “मन की शांति” जैसे व्यापक शब्द खोजें।', orAsk: 'या इस विषय के बारे में सीधे सारथि से पूछें:', failed: 'खोज पूरी नहीं हो सकी। कृपया फिर प्रयास करें।', match: 'से मिलते', ordered: 'प्रासंगिकता के क्रम में', idle: 'ग्रंथों में कोई विचार, वाक्यांश या प्रश्न खोजें।', suggestions: ['आत्मा का स्वरूप क्या है?', 'शांति कैसे पाएँ?', 'कर्तव्य क्या है?', 'शोक से मुक्ति'] },
  bn: { title: 'শাস্ত্রে খুঁজুন', placeholder: 'বিষয়, বাক্যাংশ বা শব্দ খুঁজুন', all: 'সব গ্রন্থ', searching: 'শাস্ত্রে খোঁজা হচ্ছে…', none: 'কোনো শ্লোক পাওয়া যায়নি:', hint: '“কর্তব্য”, “আত্মা” বা “মনের শান্তি”-র মতো বিস্তৃত শব্দ খুঁজুন।', orAsk: 'অথবা এই ধারণা সম্পর্কে সরাসরি সারথিকে জিজ্ঞাসা করুন:', failed: 'অনুসন্ধান সম্পূর্ণ করা যায়নি। আবার চেষ্টা করুন।', match: 'এর সঙ্গে মিলে', ordered: 'প্রাসঙ্গিকতার ক্রমে', idle: 'গ্রন্থ থেকে কোনো ভাবনা, বাক্যাংশ বা প্রশ্ন খুঁজুন।', suggestions: ['আত্মার স্বরূপ কী?', 'শান্তি কীভাবে পাওয়া যায়?', 'কর্তব্য কী?', 'দুঃখ থেকে মুক্তি'] },
  mr: { title: 'धर्मग्रंथांत शोधा', placeholder: 'विषय, वाक्यांश किंवा शब्द शोधा', all: 'सर्व ग्रंथ', searching: 'धर्मग्रंथांत शोधत आहे…', none: 'श्लोक सापडले नाहीत:', hint: '“कर्तव्य”, “आत्मा” किंवा “मनःशांती” यांसारखा व्यापक शब्द शोधा.', orAsk: 'किंवा या कल्पनेबद्दल थेट सारथीला विचारा:', failed: 'शोध पूर्ण होऊ शकला नाही. पुन्हा प्रयत्न करा.', match: 'याच्याशी जुळणारे', ordered: 'संबंधिततेनुसार क्रमबद्ध', idle: 'ग्रंथांतील कल्पना, वाक्यांश किंवा प्रश्न शोधा.', suggestions: ['आत्म्याचे स्वरूप काय आहे?', 'शांती कशी मिळवावी?', 'कर्तव्य म्हणजे काय?', 'दुःखातून मुक्ती'] },
  te: { title: 'శాస్త్రాలలో వెతకండి', placeholder: 'విషయం, పదబంధం లేదా పదంతో వెతకండి', all: 'అన్ని గ్రంథాలు', searching: 'శాస్త్రాలలో వెతుకుతోంది…', none: 'శ్లోకాలు దొరకలేదు:', hint: '“కర్తవ్యం”, “ఆత్మ” లేదా “మనశ్శాంతి” వంటి విస్తృత పదంతో వెతకండి.', orAsk: 'లేదా ఈ భావం గురించి నేరుగా సారథిని అడగండి:', failed: 'శోధన పూర్తి కాలేదు. మళ్లీ ప్రయత్నించండి.', match: 'కు సరిపోలినవి', ordered: 'సంబంధితత క్రమంలో', idle: 'గ్రంథాలలోని భావం, పదబంధం లేదా ప్రశ్న కోసం వెతకండి.', suggestions: ['ఆత్మ స్వరూపం ఏమిటి?', 'శాంతిని ఎలా పొందాలి?', 'కర్తవ్యం అంటే ఏమిటి?', 'దుఃఖం నుండి విముక్తి'] },
  ta: { title: 'சாஸ்திரங்களில் தேடவும்', placeholder: 'தலைப்பு, சொற்றொடர் அல்லது சொல்லால் தேடவும்', all: 'அனைத்து நூல்கள்', searching: 'சாஸ்திரங்களில் தேடுகிறது…', none: 'சுலோகங்கள் கிடைக்கவில்லை:', hint: '“கடமை”, “ஆன்மா” அல்லது “மன அமைதி” போன்ற பரந்த சொல்லைத் தேடவும்.', orAsk: 'அல்லது இந்தக் கருத்தைப் பற்றி நேரடியாக சாரதியிடம் கேளுங்கள்:', failed: 'தேடலை முடிக்க முடியவில்லை. மீண்டும் முயலவும்.', match: 'உடன் பொருந்தியவை', ordered: 'பொருத்தத்தின் வரிசையில்', idle: 'நூல்களில் உள்ள கருத்து, சொற்றொடர் அல்லது கேள்வியைத் தேடவும்.', suggestions: ['ஆன்மாவின் இயல்பு என்ன?', 'அமைதியை எப்படிப் பெறுவது?', 'கடமை என்றால் என்ன?', 'துயரத்திலிருந்து விடுதலை'] },
};

export default function Search() {
  const { language, t } = useLanguage();
  const labels = SEARCH_COPY[language] || SEARCH_COPY.en;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const filter = searchParams.get('filter') || 'all'; // 'all', 'gita', 'ramayana'

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q || q.length < 3) {
      setResults([]);
      setError(null);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);
    let cancelled = false;

    searchVerses(q)
      .then((data) => {
        if (!cancelled) setResults(data.results || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q]);

  const displayedResults = results.filter(v => {
    if (filter === 'gita') return !v.id?.includes('ramayana');
    if (filter === 'ramayana') return v.id?.includes('ramayana');
    return true;
  });

  return (
    <main className="search-page">
      <header className="search-page__header">
        <h1 className="search-page__heading">{labels.title}</h1>
        <SearchBar autoFocus={!q} placeholder={labels.placeholder} />
        
        <div className="search-page__filters" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {['all', 'gita', 'ramayana'].map(f => (
            <AnimatedButton
              key={f}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('filter', f);
                setSearchParams(params);
              }}
              className={`active-press search-page__filter-btn ${filter === f ? 'active' : ''}`}
              style={{
                padding: '0.4rem 1rem',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: '20px',
                border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
                backgroundColor: filter === f ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                color: filter === f ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f === 'all' ? labels.all : f === 'gita' ? (language === 'en' ? 'Bhagavad Gita' : t('heroTitleHighlight')) : t('ramayana')}
            </AnimatedButton>
          ))}
        </div>
      </header>

      {/* Results */}
      <div className="search-page__results">
        {loading && (
          <LoadingSpinner size="medium" text={labels.searching} />
        )}

        {!loading && searched && !error && displayedResults.length === 0 && (
          <div className="search-page__empty">
            <p className="search-page__empty-text">
              {labels.none} “<strong>{q}</strong>”
            </p>
            <p className="search-page__empty-hint">
              {labels.hint}
            </p>
            <div className="search-page__sarathi-suggest" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{labels.orAsk}</p>
              <AnimatedButton
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-sarathi', { detail: { prompt: q } }))}
                className="active-press inline-flex items-center justify-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-[color:var(--text-primary)] hover:border-amber-400/60 transition"
                style={{ cursor: 'pointer' }}
              >
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16" opacity="0.8">
                  <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="currentColor" opacity="0.85"/>
                </svg>
                {t('askSarathi')}
              </AnimatedButton>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="search-page__error" role="alert">
            <p>{labels.failed}</p>
          </div>
        )}

        {!loading && searched && !error && displayedResults.length > 0 && (
          <>
            <p className="search-page__meta">
              {displayedResults.length} {t('verse')} {labels.match} “<em>{q}</em>”, {labels.ordered}
            </p>
            <div className="search-page__list">
              {displayedResults.map((verse, idx) => (
                <div key={verse.id} className="stagger-item" style={{ '--stagger-idx': idx }}>
                  <IlluminatedVerseCard
                    verse={verse}
                    variant="compact"
                    similarity={verse.similarity}
                    onClick={(v) => navigate(`/verses/${v.id}`)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {!q && !loading && (
          <div className="search-page__idle">
            <p className="search-page__idle-text">
              {labels.idle}
            </p>
            <div className="search-page__suggestions">
              {labels.suggestions.map((s, idx) => (
                <AnimatedButton
                  key={s}
                  className="active-press stagger-item search-page__suggestion"
                  style={{ '--stagger-idx': idx }}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(s)}`)}
                >
                  {s}
                </AnimatedButton>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
