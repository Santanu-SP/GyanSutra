/**
 * Ask — the AI Q&A page.
 */

import AskPanel from '../components/AskPanel';
import './Ask.css';

export default function Ask() {
  return (
    <main className="ask-page">
      <header className="ask-page__header">
        <span className="ask-page__eyebrow">ज्ञान सूत्र · Gyan Sutra</span>
        <h1 className="ask-page__heading">Ask the Gita</h1>
        <p className="ask-page__subheading">
          Ask about a passage or idea. Answers draw from the verses in this library and show the relevant references.
        </p>
        <div className="ask-page__badge">
          <span className="ask-page__badge-dot" aria-hidden="true">✦</span>
          Source verses included
        </div>
      </header>
      <hr className="gold-rule" />
      <AskPanel />
    </main>
  );
}
