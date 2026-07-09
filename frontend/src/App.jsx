/**
 * App — root layout, routing, and global chrome.
 *
 * Layout: left sidebar (ChapterNav) + main content area on desktop.
 * On mobile: ChapterNav collapses to a horizontal strip at the top.
 */

import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import TextReader from './pages/TextReader';

export default function App() {
  const [isAiOpen, setIsAiOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#1a1a1f] text-gray-100 flex flex-col">
      {/* Global Navigation Header */}
      <nav className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#141419] sticky top-0 z-40">
        <Link to="/" className="text-2xl font-serif text-white no-underline font-semibold tracking-wide">
          Gyan Sutra
        </Link>
        <button
          onClick={() => setIsAiOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-indigo-500/20"
        >
          Ask AI ✨
        </button>
      </nav>

      {/* Main Content View Container */}
      <div className="flex-1 flex flex-col relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:source_id" element={<TextReader />} />
        </Routes>
      </div>

      {/* Sliding AI Assistant Drawer */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          {/* Backdrop Click Closer */}
          <div className="flex-1" onClick={() => setIsAiOpen(false)} />

          {/* Sidebar Panel */}
          <div className="w-full max-w-lg bg-[#141419] h-full border-l border-gray-800 flex flex-col p-6 shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h2 className="text-xl font-serif font-medium text-white flex items-center gap-2">
                Gyan Assistant 🔮
              </h2>
              <button
                onClick={() => setIsAiOpen(false)}
                className="p-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* AI Interaction Space */}
            <div className="flex-1 overflow-y-auto py-4 text-gray-300 text-sm space-y-4">
              <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-800">
                🙏 Greetings! Ask me anything regarding the core philosophy, context, or verses within the library.
              </div>
              {/* Future chat response mapping will go here */}
            </div>

            {/* Prompt Input Footer */}
            <div className="pt-4 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask about duty, detachment, or karma..."
                  className="flex-1 bg-[#1a1a1f] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}