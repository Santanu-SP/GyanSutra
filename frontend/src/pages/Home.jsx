import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDailyVerse } from '../services/api';
import { useScrollReveal } from '../hooks/useScrollReveal';
import AnimatedButton from '../components/AnimatedButton';


const SOURCE_STYLES = {
  'bhagavad-gita': {
    accent: 'from-amber-500/20 via-transparent to-transparent',
    glyph: 'गीता',
    label: 'Song of the Divine',
  },
  ramayana: {
    accent: 'from-orange-500/20 via-transparent to-transparent',
    glyph: 'राम',
    label: 'Epic of Dharma',
  },
  upanishads: {
    accent: 'from-indigo-500/20 via-transparent to-transparent',
    glyph: 'श्रुति',
    label: 'Whispers of the Self',
  },
  mahabharata: {
    accent: 'from-red-500/20 via-transparent to-transparent',
    glyph: 'कुरु',
    label: 'Epic of Karma',
  },
  puranas: {
    accent: 'from-emerald-500/20 via-transparent to-transparent',
    glyph: 'पुराण',
    label: 'Ancient Chronicles',
  },
};

// Static source data — matches backend/src/data/sources.js exactly.
// No API call needed: this data never changes and the cold-start delay
// on Render would make cards appear blank for ~5s on first load.
const SOURCES = [
  {
    id: 'bhagavad-gita',
    title: 'Bhagavad Gita',
    description: 'A foundational dialogue on duty, devotion, and self-knowledge.',
    available: true,
  },
  {
    id: 'ramayana',
    title: 'Ramayana',
    description: 'An epic text centered on dharma, exile, loyalty, and return.',
    available: true,
  },
  {
    id: 'upanishads',
    title: 'Upanishads',
    description: 'A contemplative collection exploring the self, reality, and liberation.',
    available: false,
  },
  {
    id: 'mahabharata',
    title: 'Mahabharata',
    description: 'The great epic of the Kurukshetra War and the destinies of princes.',
    available: false,
  },
  {
    id: 'puranas',
    title: 'Puranas',
    description: 'Ancient lore and mythological narratives of the divine.',
    available: false,
  },
];

export default function Home({ onAskPrompt = () => {} }) {
  const [dailyVerse, setDailyVerse] = useState(null);
  
  const heroRef = useScrollReveal();
  const featuresRef = useScrollReveal();
  const libraryRef = useScrollReveal();

  useEffect(() => {
    getDailyVerse()
      .then(res => setDailyVerse(res.verse))
      .catch(err => console.error("Failed to load daily darshan:", err));
  }, []);

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(79,70,229,0.16),transparent_28%)]" />

      <section className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-10 pt-3 sm:gap-8 sm:px-6 sm:pb-14 sm:pt-6 lg:px-8 lg:pb-20 lg:pt-10">
        <header ref={heroRef} className="reveal-hidden grid gap-4 grid-cols-1 sm:gap-8 lg:grid-cols-12" aria-label="Hero introduction">
          <div className="lg:col-span-7 space-y-3 sm:space-y-6 lg:pt-8">
            <div className="space-y-2 sm:space-y-4">
              <h1 className="max-w-3xl font-serif text-xl font-normal leading-snug text-[color:var(--text-primary)] sm:text-4xl lg:text-5xl">
                Eternal Wisdom of Sanatana Dharma
              </h1>
              <p className="max-w-2xl text-xs leading-5 text-[color:var(--text-secondary)] sm:text-base sm:leading-8">
                Enter a contemplative library of living scripture, where every text is presented like a revered manuscript and every inquiry unfolds with stillness, depth, and grace.
              </p>
            </div>

            <div className="flex flex-row flex-wrap items-center gap-3">
              <AnimatedButton
                type="button"
                onClick={() => {
                  const librarySection = document.getElementById('text-library');
                  librarySection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="group relative flex-1 sm:flex-none inline-flex flex-col items-center justify-center gap-0.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] px-6 py-3 transition-colors duration-200 hover:bg-amber-500/[0.08] hover:border-amber-500/40"
              >
                <span className="text-sm font-medium text-amber-500/90 group-hover:text-amber-400 transition-colors">
                  Enter the Library
                </span>
                <span className="text-[10px] font-normal text-amber-500/50 tracking-wide group-hover:text-amber-500/70 transition-colors">
                  Sacred Manuscripts
                </span>
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={() => onAskPrompt('What is the heart of Sanatan Dharma?')}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
              >
                Consult Sarathi
                <span className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">→</span>
              </AnimatedButton>
            </div>

            <div className="pt-2 sm:pt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-[color:var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Ad-Free & Private
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Complete Scriptures
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Spiritual Guide
              </span>
            </div>
          </div>

          <aside className="lg:col-span-5 relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-[color:var(--bg-surface)] p-3 sm:p-6 lg:rotate-1">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_35%)]" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                <span>Daily Darshan</span>
                <span className="text-amber-400">Featured Sutra</span>
              </div>

              <div className="space-y-3 rounded-xl sm:rounded-[1.75rem] border border-amber-700/20 bg-[color:var(--bg)] p-4 sm:p-6">
                <p className="font-serif text-xl leading-relaxed text-[color:var(--text-primary)] devanagari-hero" style={{ fontSize: '1.4rem' }}>
                  {dailyVerse ? dailyVerse.sanskrit : "“Within stillness, the eternal thread of knowledge reveals itself.”"}
                </p>
                <p className="text-sm leading-7 text-[color:var(--text-muted)] italic">
                  {dailyVerse ? `— ${dailyVerse.translationEnglish}` : "Begin with one sacred text, return each day, and let disciplined reflection become lived wisdom."}
                </p>
                {dailyVerse && (
                  <div className="mt-2 flex items-center justify-between text-xs text-amber-500/80">
                    <span>Bhagavad Gita {dailyVerse.chapterNumber}.{dailyVerse.verseNumber}</span>
                    <AnimatedButton
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-sarathi', { 
                        detail: { prompt: `What are the practical life lessons and reflection questions for Chapter ${dailyVerse.chapterNumber} Verse ${dailyVerse.verseNumber}?` } 
                      }))}
                      className="active-press inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-[color:var(--text-primary)] hover:border-amber-400/60 transition"
                      style={{ cursor: 'pointer' }}
                    >
                      <svg viewBox="0 0 20 20" fill="none" width="12" height="12" opacity="0.8">
                        <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="currentColor" opacity="0.85"/>
                      </svg>
                      Ask Sarathi
                    </AnimatedButton>
                  </div>
                )}
                <div className="flex items-center gap-3 border-t border-amber-700/10 pt-4 text-xs uppercase tracking-[0.28em] text-amber-500/80">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Contemplation for Today
                </div>
              </div>
            </div>
          </aside>
        </header>

        <section ref={featuresRef} aria-label="Feature highlights" className="reveal-hidden grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <article className="hover-lift rounded-2xl sm:rounded-[2rem] border border-amber-700/20 bg-[color:var(--bg-surface)] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.28)] sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-500/80">
                  Curated Journey
                </p>
                <h2 className="mt-2 font-serif text-2xl font-normal text-[color:var(--text-primary)]">
                  A Living Sanctuary of Texts
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[color:var(--text-muted)]">
                Move from dialogue to revelation, from epic action to inward inquiry, through a library shaped for reverence and study.
              </p>
            </div>
          </article>

          <article className="hover-lift rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.22)]">
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-300/80">
              Your Companion
            </p>
            <h2 className="mt-2 font-serif text-xl font-normal text-[color:var(--text-primary)]">
              Sarathi — सारथि
            </h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
              Ask about karma, detachment, devotion, or interpretation — and receive responses rooted in your sacred library.
            </p>
            <AnimatedButton
              type="button"
              onClick={() => onAskPrompt('How should I understand karma without attachment?')}
              className="active-press mt-5 inline-flex items-center rounded border border-amber-500/30 px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] transition hover:border-amber-400/60 hover:bg-amber-500/10"
            >
              Open Sarathi
            </AnimatedButton>
          </article>
        </section>

        <section ref={libraryRef} id="text-library" aria-label="Text library" className="reveal-hidden space-y-4 sm:space-y-6 scroll-mt-24">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-500/80">
                Text Library
              </p>
              <h2 className="mt-2 font-serif text-2xl font-normal text-[color:var(--text-primary)] sm:text-3xl">
                Sacred Manuscripts
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              Explore each text through an immersive reading experience designed with quiet depth, ceremonial restraint, and precise modern craft.
            </p>
          </div>

          {/* Source cards grid — rendered immediately from static data */}
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
            {SOURCES.map((source, idx) => {
                  const style = SOURCE_STYLES[source.id] || {
                    accent: 'from-amber-500/15 via-transparent to-transparent',
                    glyph: 'ॐ',
                    label: 'Sacred Text',
                  };

                  return (
                    <Link
                      key={source.id}
                      to={`/${source.id}`}
                      style={{ '--stagger-idx': idx }}
                      className="stagger-item hover-lift group relative overflow-hidden rounded-xl border border-amber-700/20 bg-[color:var(--bg-surface)] p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-amber-900/20"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${style.accent} opacity-80 transition duration-300 group-hover:opacity-100`} />
                      <div className="absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/[0.04]" />

                      <div className="relative flex h-full flex-col justify-between gap-6 py-1">
                        <div className="space-y-5">
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-xs uppercase tracking-[0.35em] text-amber-400/85">
                              {style.label}
                            </span>
                            <span className="font-serif text-2xl text-amber-200/90">
                              {style.glyph}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <h3 className="font-serif text-xl font-normal text-[color:var(--text-primary)]">
                              {source.title}
                            </h3>
                            <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
                              {source.description}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="h-px w-full bg-gradient-to-r from-amber-500/40 via-amber-500/10 to-transparent" />
                          <div className="flex items-center justify-between text-sm text-[color:var(--text-secondary)]">
                            <span className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--accent)] transition-colors">
                              {source.available ? 'Continue reading →' : 'Coming Soon'}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium transition group-hover:border-amber-400/60 ${
                              source.available
                                ? 'border-amber-500/25 text-amber-100'
                                : 'border-stone-500/25 text-stone-400 italic'
                            }`}>
                              {source.available ? 'Enter' : 'Soon'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </section>
      </section>
    </main>
  );
}
