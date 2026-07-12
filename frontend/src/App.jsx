import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { askQuestion } from './services/api';
import Home from './pages/Home';
import TextReader from './pages/TextReader';

const SUGGESTED_PROMPTS = [
  'What does the Gita teach about duty?',
  'Explain detachment in simple words.',
  'How does Sanatan wisdom guide daily life?',
];

export default function App() {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'guide',
      content:
        'Ask for insight on dharma, karma, devotion, or any verse in the library.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleAsk(event) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading) return;

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      const result = await askQuestion(trimmedQuestion);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-guide`,
          role: 'guide',
          content: result.answer || 'No answer was returned.',
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          role: 'guide',
          content: error.message || 'The guide could not respond right now.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePromptSelect(prompt) {
    setQuestion(prompt);
    setIsGuideOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#1a1a1f] text-stone-100">
      <div className="fixed inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(180,83,9,0.18),transparent_42%),radial-gradient(circle_at_20%_20%,rgba(49,46,129,0.22),transparent_30%)]" />

      <header className="sticky top-0 z-40 border-b border-amber-700/20 bg-[#141419]/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group inline-flex items-center gap-3 rounded-full border border-amber-700/20 bg-white/[0.03] px-3 py-2 transition hover:border-amber-500/40 hover:bg-white/[0.05]"
          >
            <img
              src="/icons/logo.svg"
              alt="Gyan Sutra Logo"
              className="h-10 w-10 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="flex flex-col">
              <span className="font-serif text-xl tracking-[0.16em] text-stone-50">
                Gyan Sutra
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.35em] text-stone-400">
                Sacred Library
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-indigo-500/15 px-4 py-2.5 text-sm font-medium text-amber-100 shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_10px_30px_rgba(120,53,15,0.18)] transition duration-300 hover:border-amber-400/60 hover:from-amber-500/25 hover:to-indigo-500/25 hover:shadow-amber-900/20"
            >
              <span className="text-amber-400">✦</span>
              Ask AI
            </button>
          </div>
        </nav>
      </header>

      <div className="relative">
        <Routes>
          <Route path="/" element={<Home onAskPrompt={handlePromptSelect} />} />
          <Route path="/:source_id" element={<TextReader />} />
        </Routes>
      </div>

      {isGuideOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close Divine Guide"
            className="h-full flex-1 cursor-default"
            onClick={() => setIsGuideOpen(false)}
          />

          <aside className="flex h-full w-full max-w-xl flex-col border-l border-amber-700/20 bg-[#141419] shadow-[0_0_60px_rgba(0,0,0,0.55)]">
            <div className="border-b border-amber-700/20 px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-500/80">
                    Sacred Counsel
                  </p>
                  <h2 className="mt-2 font-serif text-2xl text-stone-50">
                    Divine Guide
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-stone-400">
                    Reflect on scripture, meaning, and practice through a calm conversational guide.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGuideOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-700/20 bg-white/[0.03] text-stone-300 transition hover:border-amber-500/40 hover:text-stone-50"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="border-b border-amber-700/10 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuestion(prompt)}
                    className="rounded-full border border-amber-700/20 bg-white/[0.03] px-3 py-1.5 text-xs text-stone-300 transition hover:border-amber-500/40 hover:text-amber-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`max-w-[92%] rounded-3xl px-4 py-3 ${message.role === 'user'
                        ? 'ml-auto border border-indigo-500/20 bg-indigo-500/10 text-stone-100'
                        : 'border border-amber-700/20 bg-white/[0.03] text-stone-300'
                      }`}
                  >
                    <p className="mb-2 text-[0.65rem] uppercase tracking-[0.3em] text-amber-400/80">
                      {message.role === 'user' ? 'Seeker' : 'Divine Guide'}
                    </p>
                    <p className="text-sm leading-7">{message.content}</p>
                  </article>
                ))}

                {isLoading ? (
                  <div className="max-w-[92%] rounded-3xl border border-amber-700/20 bg-white/[0.03] px-4 py-3 text-sm text-stone-400">
                    <p className="mb-2 text-[0.65rem] uppercase tracking-[0.3em] text-amber-400/80">
                      Divine Guide
                    </p>
                    <p>Contemplating the thread of wisdom...</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-amber-700/20 px-5 py-5 sm:px-6">
              <form onSubmit={handleAsk} className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-stone-500">
                    Your reflection
                  </span>
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    rows={4}
                    placeholder="Ask about dharma, devotion, karma, or a verse in the library..."
                    className="w-full rounded-3xl border border-amber-700/20 bg-[#1a1a1f] px-4 py-3 text-sm leading-7 text-stone-100 placeholder:text-stone-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10"
                  />
                </label>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs leading-6 text-stone-500">
                    Responses are grounded in your current scripture library.
                  </p>
                  <button
                    type="submit"
                    disabled={isLoading || !question.trim()}
                    className="inline-flex items-center justify-center rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-indigo-500/20 px-5 py-2.5 text-sm font-medium text-amber-100 transition hover:border-amber-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Offer Question
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
