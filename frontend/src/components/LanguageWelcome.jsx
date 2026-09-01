import { useState } from 'react';
import './LanguageWelcome.css';

export default function LanguageWelcome({ languages, onSelect }) {
  const [selected, setSelected] = useState('en');

  return (
    <main className="language-welcome">
      <section className="language-welcome__card" aria-labelledby="language-title">
        <img src={`${import.meta.env.BASE_URL}icons/logo.svg`} alt="" className="language-welcome__logo" />
        <p className="language-welcome__brand">Gyan Sutra · ज्ञान सूत्र</p>
        <h1 id="language-title">Choose your language</h1>
        <p className="language-welcome__multilingual">अपनी भाषा चुनें · আপনার ভাষা বেছে নিন · तुमची भाषा निवडा<br />మీ భాషను ఎంచుకోండి · உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்</p>
        <div className="language-welcome__grid" role="radiogroup" aria-label="Choose your language">
          {languages.map((item) => (
            <button key={item.code} type="button" role="radio" aria-checked={selected === item.code} className={`language-welcome__option ${item.fontClass}${selected === item.code ? ' is-selected' : ''}`} onClick={() => setSelected(item.code)}>
              <span>{item.nativeName}</span>
              <small>{item.name}</small>
            </button>
          ))}
        </div>
        <button type="button" className="language-welcome__continue" onClick={() => onSelect(selected)}>
          {copyForContinue[selected]} <span aria-hidden="true">→</span>
        </button>
        <p className="language-welcome__note">Your choice will be remembered on this device.</p>
      </section>
    </main>
  );
}

const copyForContinue = { en: 'Continue', hi: 'आगे बढ़ें', bn: 'এগিয়ে যান', mr: 'पुढे जा', te: 'కొనసాగించండి', ta: 'தொடரவும்' };
