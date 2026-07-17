import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDailyVerse } from '../services/api';

const SOURCE_STYLES = {
  'bhagavad-gita': {
    accent: 'from-amber-500/20 via-transparent to-transparent',
    glyph: 'गीता',
    label: 'Song of the Divine',
  },
  upanishads: {
    accent: 'from-indigo-500/20 via-transparent to-transparent',
    glyph: 'श्रुति',
    label: 'Whispers of the Self',
  },
  ramayana: {
    accent: 'from-orange-500/20 via-transparent to-transparent',
    glyph: 'राम',
    label: 'Epic of Dharma',
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
    id: 'upanishads',
    title: 'Upanishads',
    description: 'A contemplative collection exploring the self, reality, and liberation.',
    available: false,
  },
  {
    id: 'ramayana',
    title: 'Ramayana',
    description: 'An epic text centered on dharma, exile, loyalty, and return.',
    available: true,
  },
];

export default function Home({ onAskPrompt = () => {} }) {
  const [dailyVerse, setDailyVerse] = useState(null);

  useEffect(() => {
    getDailyVerse()
      .then(res => setDailyVerse(res.verse))
      .catch(err => console.error("Failed to load daily darshan:", err));
  }, []);

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(79,70,229,0.16),transparent_28%)]" />

      <section className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-12">
        <header className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-700/20 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.35em] text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.55)]" />
              Sacred Archive
            </p>

            <div className="space-y-4">
              <h1 className="max-w-4xl font-serif text-4xl leading-tight text-[color:var(--text-primary)] sm:text-5xl lg:text-7xl">
                Eternal Wisdom of Sanatan Dharma
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[color:var(--text-secondary)] sm:text-lg">
                Enter a contemplative library of living scripture, where every text is presented like a revered manuscript and every inquiry unfolds with stillness, depth, and grace.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  const librarySection = document.getElementById('text-library');
                  librarySection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="inline-flex items-center justify-center rounded border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-amber-300/10 px-6 py-3 text-sm font-medium text-[color:var(--accent)] transition hover:border-amber-400/60 hover:text-[color:var(--accent-hover)]"
              >
                Enter the Library
              </button>
              <button
                type="button"
                onClick={() => onAskPrompt('What is the heart of Sanatan Dharma?')}
                className="inline-flex items-center justify-center rounded border border-amber-500/20 bg-amber-500/8 px-6 py-3 text-sm font-medium text-[color:var(--text-primary)] transition hover:border-amber-400/60 hover:text-[color:var(--accent)]"
              >
                Consult Sarathi
              </button>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[2rem] border border-amber-700/20 bg-[color:var(--bg-surface)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_35%)]" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                <span>Daily Darshan</span>
                <span className="text-amber-400">Featured Sutra</span>
              </div>

              <div className="space-y-4 rounded-[1.75rem] border border-amber-700/20 bg-[color:var(--bg)] p-6">
                <p className="font-serif text-xl leading-relaxed text-[color:var(--text-primary)] devanagari-hero" style={{ fontSize: '1.4rem' }}>
                  {dailyVerse ? dailyVerse.sanskrit : "“Within stillness, the eternal thread of knowledge reveals itself.”"}
                </p>
                <p className="text-sm leading-7 text-[color:var(--text-muted)] italic">
                  {dailyVerse ? `— ${dailyVerse.translationEnglish}` : "Begin with one sacred text, return each day, and let disciplined reflection become lived wisdom."}
                </p>
                {dailyVerse && (
                  <div className="mt-2 flex items-center justify-between text-xs text-amber-500/80">
                    <span>Bhagavad Gita {dailyVerse.chapterNumber}.{dailyVerse.verseNumber}</span>
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

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <article className="rounded-[2rem] border border-amber-700/20 bg-[color:var(--bg-surface)] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.28)] sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-500/80">
                  Curated Journey
                </p>
                <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-primary)]">
                  A Living Sanctuary of Texts
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[color:var(--text-muted)]">
                Move from dialogue to revelation, from epic action to inward inquiry, through a library shaped for reverence and study.
              </p>
            </div>
          </article>

          <article className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.22)]">
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-300/80">
              Your Companion
            </p>
            <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-primary)]">
              Sarathi — सारथि
            </h3>
            <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
              Ask about karma, detachment, devotion, or interpretation — and receive responses rooted in your sacred library.
            </p>
            <button
              type="button"
              onClick={() => onAskPrompt('How should I understand karma without attachment?')}
              className="mt-5 inline-flex items-center rounded border border-amber-500/30 px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] transition hover:border-amber-400/60 hover:bg-amber-500/10"
            >
              Open Sarathi
            </button>
          </article>
        </section>

        <section id="text-library" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-500/80">
                Text Library
              </p>
              <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-primary)] sm:text-4xl">
                Sacred Manuscripts
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              Explore each text through an immersive reading experience designed with quiet depth, ceremonial restraint, and precise modern craft.
            </p>
          </div>

          {/* Source cards grid — rendered immediately from static data */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {SOURCES.map((source) => {
                  const style = SOURCE_STYLES[source.id] || {
                    accent: 'from-amber-500/15 via-transparent to-transparent',
                    glyph: 'ॐ',
                    label: 'Sacred Text',
                  };

                  return (
                    <Link
                      key={source.id}
                      to={`/${source.id}`}
                      className="group relative overflow-hidden rounded-xl border border-amber-700/20 bg-[color:var(--bg-surface)] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-amber-900/20"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${style.accent} opacity-80 transition duration-300 group-hover:opacity-100`} />
                      <div className="absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/[0.04]" />

                      <div className="relative flex h-full min-h-[320px] flex-col justify-between">
                        <div className="space-y-5">
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-xs uppercase tracking-[0.35em] text-amber-400/85">
                              {style.label}
                            </span>
                            <span className="font-serif text-3xl text-amber-200/90">
                              {style.glyph}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <h3 className="font-serif text-3xl text-[color:var(--text-primary)]">
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
                            <span className="uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                              {source.available ? 'Open Manuscript' : 'Coming Soon'}
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
