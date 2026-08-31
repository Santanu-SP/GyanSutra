import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '../components/SEO/SEOHead';
import { FAQPageSchema, OrganizationSchema, WebApplicationSchema } from '../components/SEO/StructuredData';

const FAQ_DATA = [
  {
    id: 'reading-1',
    category: 'Reading',
    question: 'Which texts can I read?',
    answer: 'The Bhagavad Gita and Valmiki Ramayana are available now. The Upanishads, Mahabharata, and Puranas are in preparation.',
  },
  {
    id: 'reading-2',
    category: 'Reading',
    question: 'What is included with each verse?',
    answer: 'Available entries can include Sanskrit in Devanagari, Roman transliteration, word meanings, English translation, and commentary.',
  },
  {
    id: 'reading-3',
    category: 'Reading',
    question: 'How do I find a passage?',
    answer: 'Use Search to look for a topic, phrase, or keyword. You can narrow the results to the Bhagavad Gita or Ramayana.',
  },
  {
    id: 'reading-4',
    category: 'Reading',
    question: 'Can I jump to a Gita chapter?',
    answer: 'Yes. Open the Bhagavad Gita and enter a chapter number in the jump field, or choose a chapter from the list.',
  },
  {
    id: 'reading-5',
    category: 'Reading',
    question: 'How should I use the translations and commentary?',
    answer: 'Use them as study aids. Translation and interpretation can differ across traditions, so compare editions when a distinction matters to your study.',
  },
  {
    id: 'sarathi-1',
    category: 'Sarathi',
    question: 'What is Sarathi?',
    answer: 'Sarathi is a study assistant for questions about the texts in this library. It looks for relevant passages and explains them in plain language.',
  },
  {
    id: 'sarathi-2',
    category: 'Sarathi',
    question: 'Can Sarathi make mistakes?',
    answer: 'Yes. AI-generated explanations can be incomplete or wrong. Check the cited verses and do not treat an answer as the only interpretation.',
  },
  {
    id: 'sarathi-3',
    category: 'Sarathi',
    question: 'Can Sarathi give professional advice?',
    answer: 'No. It is for scripture study, not medical, legal, financial, or mental health advice.',
  },
  {
    id: 'sarathi-4',
    category: 'Sarathi',
    question: 'Should I enter private information in Sarathi?',
    answer: 'No. Keep names, contact details, financial information, health records, and other sensitive information out of your questions.',
  },
  {
    id: 'app-1',
    category: 'App',
    question: 'Do I need an account?',
    answer: 'No. Reading, search, and Sarathi are available without creating an account.',
  },
  {
    id: 'app-2',
    category: 'App',
    question: 'Can I install Gyan Sutra?',
    answer: 'Yes. On supported browsers, use Add to Home Screen or Install App. It will open in its own app window.',
  },
  {
    id: 'app-3',
    category: 'App',
    question: 'Can I read without an internet connection?',
    answer: 'Some pages you have already opened may remain available offline. Search and Sarathi need a connection.',
  },
  {
    id: 'app-4',
    category: 'App',
    question: 'Is there audio recitation?',
    answer: 'Not at present. The current app is designed for text-based reading and study.',
  },
];

const CATEGORIES = ['All', 'Reading', 'Sarathi', 'App'];

function FAQAccordionItem({ item, isOpen, onToggle }) {
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
        description="Answers about reading, search, Sarathi, offline use, and installing Gyan Sutra."
        canonical="/faq"
        schemaData={schemaData}
      />

      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="mb-4 font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[color:var(--text-primary)]">
            Frequently Asked Questions
          </h1>
          <p className="text-[color:var(--text-secondary)]">
            Practical details about reading, search, Sarathi, and the app.
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
