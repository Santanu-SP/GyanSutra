import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEO/SEOHead';
import { FAQPageSchema, OrganizationSchema, WebApplicationSchema } from '../components/SEO/StructuredData';

const FAQ_DATA = [
  // TRUST & SAFETY
  {
    id: "trust-1",
    category: "Trust & Safety",
    question: "Is this app fully trustable?",
    answer: "Gyan Sutra sources all scripture content directly from authentic Sanskrit texts — the complete Valmiki Ramayana (all 7 Kandas, 645 Sargas) and the Srimad Bhagwat Gita (all 18 chapters, 700 shlokas). We respect your privacy: we do not sell personal data, and your conversations with Sarathi are encrypted and never used to train AI models. While we strive for scriptural accuracy, spiritual interpretation may vary by tradition."
  },
  {
    id: "trust-2",
    category: "Trust & Safety",
    question: "Who created Gyan Sutra and why?",
    answer: "Gyan Sutra was created to make ancient Sanatana Dharma wisdom accessible to everyone in the digital age. Our mission is to preserve and present scriptures with scholarly integrity while leveraging modern AI to help seekers find relevant guidance."
  },
  // SCRIPTURES
  {
    id: "script-1",
    category: "Scriptures",
    question: "Does this app contain the whole Ramayana?",
    answer: "Yes. The complete Valmiki Ramayana with all 7 Kandas — Bala, Ayodhya, Aranya, Kishkindha, Sundara, Yuddha, and Uttara Kanda — all 645 Sargas. Each includes Sanskrit Devanagari, Roman transliteration, word-by-word meaning, and translation."
  },
  {
    id: "script-2",
    category: "Scriptures",
    question: "Does this app contain the whole Bhagwat Gita?",
    answer: "Yes. All 18 chapters and all 700 original shlokas. Each verse includes Sanskrit Devanagari, Roman transliteration, word meanings, translation, and commentary."
  },
  {
    id: "script-3",
    category: "Scriptures",
    question: "How accurate are the translations?",
    answer: "Based on established scholarly works and traditional commentaries. We cross-reference multiple authoritative sources and provide word-by-word breakdowns."
  },
  {
    id: "script-4",
    category: "Scriptures",
    question: "Can I read offline?",
    answer: "Yes. Gyan Sutra is a PWA. Scripture pages are cached via Workbox for offline reading. Install it on your home screen."
  },
  {
    id: "script-5",
    category: "Scriptures",
    question: "Is there audio recitation available?",
    answer: "Currently focused on text-based study. Audio recitation is on our development roadmap."
  },
  {
    id: "script-6",
    category: "Scriptures",
    question: "What languages are supported?",
    answer: "English interface with Sanskrit scriptures in Devanagari and Roman transliteration. More languages coming soon."
  },
  {
    id: "script-7",
    category: "Scriptures",
    question: "Can I contribute translations or report errors?",
    answer: "Yes. Use the \"Report Error\" button on any verse page or contact us via the feedback form."
  },
  // SARATHI AI
  {
    id: "ai-1",
    category: "Sarathi AI",
    question: "Does Sarathi know everything in the world?",
    answer: "No. Sarathi is an AI spiritual guide powered by Google's Gemini Flash through a RAG system that searches our scripture database. It does not have real-time internet access, cannot predict the future, and should not replace professional advice for medical, legal, or financial matters."
  },
  {
    id: "ai-2",
    category: "Sarathi AI",
    question: "Can I ask Sarathi personal life questions?",
    answer: "Yes. Sarathi offers scriptural perspective on relationships, career, stress, ethics, and life purpose. But it provides spiritual wisdom, not professional counseling."
  },
  {
    id: "ai-3",
    category: "Sarathi AI",
    question: "Is my chat history with Sarathi private?",
    answer: "Yes. Conversations are encrypted. We do not use chat data to train AI models or share with third parties. You can delete history anytime."
  },
  // FEATURES
  {
    id: "feat-1",
    category: "Features",
    question: "Is Gyan Sutra free to use?",
    answer: "Yes, completely free. All scripture reading, search, and Sarathi conversations are available without charge."
  },
  {
    id: "feat-2",
    category: "Features",
    question: "Do I need to create an account to read scriptures?",
    answer: "No. All scripture content is freely accessible without an account. An optional account enables bookmarking and chat history sync."
  },
  {
    id: "feat-3",
    category: "Features",
    question: "Can I share verses on WhatsApp and social media?",
    answer: "Yes. Every verse has share buttons for WhatsApp, Twitter/X, Facebook, and LinkedIn with rich preview images."
  },
  {
    id: "feat-4",
    category: "Features",
    question: "Is there a mobile app for iOS or Android?",
    answer: "Gyan Sutra is a PWA that works like a native app on both platforms. Install directly from your browser — no app store needed."
  },
  // TECHNICAL
  {
    id: "tech-1",
    category: "Technical",
    question: "How often is new content added?",
    answer: "Core scriptures are complete. We add new commentaries, articles, and study guides monthly."
  },
  {
    id: "tech-2",
    category: "Technical",
    question: "How do I contact support or report a bug?",
    answer: "Reach us at support@gyansutraapp.com or through the Contact page. We typically respond within 24-48 hours."
  }
];

const CATEGORIES = ["All", "Trust & Safety", "Scriptures", "Sarathi AI", "Features", "Technical"];

function FAQAccordionItem({ item, isOpen, onToggle }) {
  const [feedback, setFeedback] = useState(null);

  return (
    <div className="border-b border-[color:var(--border)] overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${item.id}`}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-[color:var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
      >
        <span className="text-[1.05rem] font-medium text-[color:var(--text-primary)] leading-snug pr-4">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-shrink-0 text-amber-500/70"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-answer-${item.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="pb-6 pr-4 text-sm leading-relaxed text-[color:var(--text-secondary)]">
              <p>{item.answer}</p>
              
              {/* Feedback UI */}
              <div className="mt-4 flex items-center gap-4 text-xs">
                <span className="text-[color:var(--text-muted)]">Was this helpful?</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFeedback('yes')}
                    className={`rounded-full border px-3 py-1 transition-colors ${
                      feedback === 'yes' 
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                        : 'border-[color:var(--border)] hover:border-emerald-500/30 hover:text-emerald-400'
                    }`}
                    aria-label="Yes, this was helpful"
                  >
                    👍 Yes
                  </button>
                  <button 
                    onClick={() => setFeedback('no')}
                    className={`rounded-full border px-3 py-1 transition-colors ${
                      feedback === 'no' 
                        ? 'border-red-500/50 bg-red-500/10 text-red-400' 
                        : 'border-[color:var(--border)] hover:border-red-500/30 hover:text-red-400'
                    }`}
                    aria-label="No, this was not helpful"
                  >
                    👎 No
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openItemId, setOpenItemId] = useState(null);

  // Filter logic
  const filteredData = useMemo(() => {
    return FAQ_DATA.filter(item => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  const handleToggle = (id) => {
    setOpenItemId(prev => prev === id ? null : id);
  };

  // Structured Data Object
  const schemaData = [
    OrganizationSchema(),
    WebApplicationSchema(),
    FAQPageSchema(FAQ_DATA)
  ];

  return (
    <main className="relative min-h-screen px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <SEOHead
        title="Frequently Asked Questions"
        description="Find answers about Gyan Sutra's trustability, scriptures, Sarathi AI, privacy, and features."
        canonical="/faq"
        schemaData={schemaData}
      />

      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-10 text-center">
          <Link to="/" className="mb-6 inline-block text-xs font-medium uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors">
            ← Back to Library
          </Link>
          <h1 className="mb-4 font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[color:var(--text-primary)]">
            Frequently Asked Questions
          </h1>
          <p className="text-[color:var(--text-secondary)]">
            Everything you need to know about Gyan Sutra, our scriptures, and Sarathi AI.
          </p>
        </header>

        {/* Search & Tabs */}
        <div className="mb-10 space-y-6">
          <div className="relative mx-auto max-w-lg">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="search"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] py-3 pl-12 pr-4 text-sm text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === category 
                    ? 'bg-amber-500/15 text-[color:var(--accent)] border border-amber-500/30' 
                    : 'bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] border border-[color:var(--border)] hover:border-amber-500/30 hover:text-[color:var(--text-primary)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ List */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-2 shadow-sm sm:px-8 sm:py-4">
          {filteredData.length > 0 ? (
            <div className="divide-y divide-[color:var(--border)]">
              {filteredData.map((item) => (
                <FAQAccordionItem
                  key={item.id}
                  item={item}
                  isOpen={openItemId === item.id}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[color:var(--text-muted)]">
              <p>No questions found matching "{searchQuery}"</p>
              <button 
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="mt-4 text-amber-500 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
