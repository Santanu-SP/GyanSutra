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
          Ask any question. Every answer is grounded in a specific verse — no guesses, no opinions.
          If the scripture doesn't have a clear answer, you'll hear that plainly.
        </p>
        <div className="ask-page__badge">
          <span className="ask-page__badge-dot" aria-hidden="true">✦</span>
          Retrieval-grounded · Citations included
        </div>
      </header>
      <hr className="gold-rule" />
      <AskPanel />
    </main>
  );
}
