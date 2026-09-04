import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech';

import './ReadAloudControls.css';

const COPY = {
  en: {
    listen: 'Listen', stop: 'Stop', speed: 'Speed', voice: 'Voice', deviceDefault: 'Device default',
    reading: 'Reading', meaning: 'Verse & meaning', full: 'Include explanation',
    preparing: 'Preparing the reading…', playing: 'Reading aloud', error: 'Read aloud could not start on this device.',
    missingVoice: 'A reading voice for this language is not installed.', installVoice: 'Install a voice',
    translation: 'Translation', explanation: 'Explanation', context: 'Context', quality: 'Voice quality depends on the speech voices installed on this device.',
  },
  hi: {
    listen: 'सुनें', stop: 'रोकें', speed: 'गति', voice: 'आवाज़', deviceDefault: 'डिवाइस की आवाज़',
    reading: 'वाचन', meaning: 'श्लोक और अर्थ', full: 'व्याख्या सहित',
    preparing: 'पाठ तैयार हो रहा है…', playing: 'पाठ सुनाया जा रहा है', error: 'इस डिवाइस पर वाचन शुरू नहीं हो सका।',
    missingVoice: 'इस भाषा की वाचन आवाज़ इंस्टॉल नहीं है।', installVoice: 'आवाज़ इंस्टॉल करें',
    translation: 'अनुवाद', explanation: 'व्याख्या', context: 'प्रसंग', quality: 'आवाज़ की गुणवत्ता इस डिवाइस पर इंस्टॉल की गई वाचन आवाज़ों पर निर्भर करती है।',
  },
  bn: {
    listen: 'শুনুন', stop: 'বন্ধ করুন', speed: 'গতি', voice: 'কণ্ঠ', deviceDefault: 'ডিভাইসের কণ্ঠ',
    reading: 'পাঠ', meaning: 'শ্লোক ও অর্থ', full: 'ব্যাখ্যাসহ',
    preparing: 'পাঠ প্রস্তুত হচ্ছে…', playing: 'পাঠ শোনানো হচ্ছে', error: 'এই ডিভাইসে পাঠ শোনানো শুরু করা যায়নি।',
    missingVoice: 'এই ভাষার পাঠকণ্ঠ ইনস্টল করা নেই।', installVoice: 'কণ্ঠ ইনস্টল করুন',
    translation: 'অনুবাদ', explanation: 'ব্যাখ্যা', context: 'প্রসঙ্গ', quality: 'কণ্ঠের স্বাভাবিকতা এই ডিভাইসে ইনস্টল করা কণ্ঠগুলির উপর নির্ভর করে।',
  },
  mr: {
    listen: 'ऐका', stop: 'थांबवा', speed: 'गती', voice: 'आवाज', deviceDefault: 'डिवाइसचा आवाज',
    reading: 'वाचन', meaning: 'श्लोक आणि अर्थ', full: 'स्पष्टीकरणासह',
    preparing: 'वाचन तयार होत आहे…', playing: 'वाचन सुरू आहे', error: 'या डिवाइसवर वाचन सुरू करता आले नाही.',
    missingVoice: 'या भाषेचा वाचन आवाज इंस्टॉल केलेला नाही.', installVoice: 'आवाज इंस्टॉल करा',
    translation: 'अनुवाद', explanation: 'स्पष्टीकरण', context: 'संदर्भ', quality: 'आवाजाची नैसर्गिकता या डिवाइसवर इंस्टॉल केलेल्या आवाजांवर अवलंबून असते.',
  },
  te: {
    listen: 'వినండి', stop: 'ఆపండి', speed: 'వేగం', voice: 'స్వరం', deviceDefault: 'పరికరం స్వరం',
    reading: 'పఠనం', meaning: 'శ్లోకం మరియు అర్థం', full: 'వివరణతో',
    preparing: 'పఠనం సిద్ధమవుతోంది…', playing: 'చదివి వినిపిస్తోంది', error: 'ఈ పరికరంలో చదివి వినిపించడం ప్రారంభించలేకపోయాం.',
    missingVoice: 'ఈ భాషకు సంబంధించిన పఠన స్వరం ఇన్‌స్టాల్ కాలేదు.', installVoice: 'స్వరాన్ని ఇన్‌స్టాల్ చేయండి',
    translation: 'అనువాదం', explanation: 'వివరణ', context: 'సందర్భం', quality: 'స్వరం సహజంగా వినిపించడం ఈ పరికరంలో ఇన్‌స్టాల్ చేసిన స్వరాలపై ఆధారపడి ఉంటుంది.',
  },
  ta: {
    listen: 'கேளுங்கள்', stop: 'நிறுத்தவும்', speed: 'வேகம்', voice: 'குரல்', deviceDefault: 'சாதனத்தின் குரல்',
    reading: 'வாசிப்பு', meaning: 'சுலோகமும் பொருளும்', full: 'விளக்கத்துடன்',
    preparing: 'வாசிப்பு தயாராகிறது…', playing: 'வாசித்துக் கொண்டிருக்கிறது', error: 'இந்தச் சாதனத்தில் வாசிப்பைத் தொடங்க முடியவில்லை.',
    missingVoice: 'இந்த மொழிக்கான வாசிப்புக் குரல் நிறுவப்படவில்லை.', installVoice: 'குரலை நிறுவவும்',
    translation: 'மொழிபெயர்ப்பு', explanation: 'விளக்கம்', context: 'சூழல்', quality: 'குரலின் இயல்பான தன்மை இந்தச் சாதனத்தில் நிறுவப்பட்டுள்ள குரல்களைப் பொறுத்தது.',
  },
};

const LANGUAGE_LOCALES = {
  english: 'en-IN', hindi: 'hi-IN', bengali: 'bn-IN', marathi: 'mr-IN', telugu: 'te-IN', tamil: 'ta-IN',
};
const CONTENT_LANGUAGE_CODES = {
  english: 'en', hindi: 'hi', bengali: 'bn', marathi: 'mr', telugu: 'te', tamil: 'ta',
};
const SPEEDS = [
  { value: 0.8, label: '0.8×' },
  { value: 0.95, label: '0.95×' },
  { value: 1.1, label: '1.1×' },
];

function normalizeSpeechText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function chunkSpeechText(value, maximum = 2_400) {
  const text = normalizeSpeechText(value);
  if (!text) return [];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maximum) {
    const window = remaining.slice(0, maximum);
    const boundary = Math.max(
      window.lastIndexOf('। '),
      window.lastIndexOf('. '),
      window.lastIndexOf('? '),
      window.lastIndexOf('! '),
      window.lastIndexOf(' '),
    );
    const end = boundary > maximum * 0.6 ? boundary + 1 : maximum;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function matchingLocale(preferred, supportedLanguages) {
  if (!preferred) return null;
  if (!supportedLanguages.length) return preferred;
  const normalized = preferred.toLowerCase();
  const exact = supportedLanguages.find((item) => item.toLowerCase() === normalized);
  if (exact) return exact;
  const base = normalized.split('-')[0];
  return supportedLanguages.find((item) => item.toLowerCase().split('-')[0] === base) || null;
}

export default function ReadAloudControls({
  verseKey,
  sanskrit,
  translation,
  explanation,
  context,
  language,
  contentLanguage,
  disabled = false,
}) {
  const labels = COPY[language] || COPY.en;
  const spokenLabels = COPY[CONTENT_LANGUAGE_CODES[contentLanguage]] || COPY.en;
  const preferredLocale = LANGUAGE_LOCALES[contentLanguage] || 'en-IN';
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [rate, setRate] = useState(0.95);
  const [readingScope, setReadingScope] = useState('meaning');
  const [voices, setVoices] = useState([]);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [voiceIndex, setVoiceIndex] = useState('');
  const operationRef = useRef(0);

  const matchingVoices = useMemo(() => {
    const languageBase = preferredLocale.toLowerCase().split('-')[0];
    return voices
      .map((voice, index) => ({ ...voice, index }))
      .filter((voice) => voice.lang?.toLowerCase().split('-')[0] === languageBase);
  }, [preferredLocale, voices]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      TextToSpeech.getSupportedVoices(),
      TextToSpeech.getSupportedLanguages(),
    ]).then(([voiceResult, languageResult]) => {
      if (!active) return;
      setVoices(voiceResult.status === 'fulfilled' ? voiceResult.value.voices || [] : []);
      setSupportedLanguages(languageResult.status === 'fulfilled' ? languageResult.value.languages || [] : []);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setVoiceIndex('');
  }, [contentLanguage]);

  useEffect(() => {
    operationRef.current += 1;
    setStatus('idle');
    setError('');
    void TextToSpeech.stop().catch(() => {});
    return () => {
      operationRef.current += 1;
      void TextToSpeech.stop().catch(() => {});
    };
  }, [verseKey, translation, explanation, context]);

  const stop = async () => {
    operationRef.current += 1;
    setStatus('idle');
    setError('');
    await TextToSpeech.stop().catch(() => {});
  };

  const listen = async () => {
    if (status === 'playing' || status === 'preparing') {
      await stop();
      return;
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setError('');
    setStatus('preparing');

    try {
      await TextToSpeech.stop();
      const proseLocale = matchingLocale(preferredLocale, supportedLanguages);
      if (!proseLocale) {
        setError(labels.missingVoice);
        setStatus('error');
        return;
      }

      const sanskritLocale = matchingLocale('sa-IN', supportedLanguages)
        || matchingLocale('hi-IN', supportedLanguages);
      const prose = [
        translation ? `${spokenLabels.translation}. ${translation}` : '',
        readingScope === 'full' && explanation ? `${spokenLabels.explanation}. ${explanation}` : '',
        readingScope === 'full' && context ? `${spokenLabels.context}. ${context}` : '',
      ].filter(Boolean).join(' ');
      const sections = [
        sanskrit && sanskritLocale ? { text: sanskrit, lang: sanskritLocale, useSelectedVoice: false } : null,
        prose ? { text: prose, lang: proseLocale, useSelectedVoice: true } : null,
      ].filter(Boolean);

      if (!sections.length) {
        setError(labels.error);
        setStatus('error');
        return;
      }

      setStatus('playing');
      for (const section of sections) {
        for (const text of chunkSpeechText(section.text)) {
          if (operationRef.current !== operation) return;
          const options = {
            text,
            lang: section.lang,
            rate,
            pitch: 1,
            volume: 1,
            category: 'playback',
            queueStrategy: QueueStrategy.Flush,
          };
          if (section.useSelectedVoice && voiceIndex !== '') {
            options.voice = Number(voiceIndex);
          }
          await TextToSpeech.speak(options);
        }
      }
      if (operationRef.current === operation) setStatus('idle');
    } catch {
      if (operationRef.current === operation) {
        setError(labels.error);
        setStatus('error');
      }
    }
  };

  const installVoice = async () => {
    try {
      await TextToSpeech.openInstall();
    } catch {
      setError(labels.error);
    }
  };

  const active = status === 'playing' || status === 'preparing';
  const statusMessage = status === 'preparing'
    ? labels.preparing
    : status === 'playing' ? labels.playing : error;

  return (
    <section className="read-aloud" aria-label={labels.listen}>
      <div className="read-aloud__primary-row">
        <button
          type="button"
          className={`read-aloud__button${active ? ' read-aloud__button--active' : ''}`}
          onClick={listen}
          disabled={disabled}
          aria-pressed={active}
        >
          {active ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z" /><path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          )}
          <span>{active ? labels.stop : labels.listen}</span>
        </button>

        <label className="read-aloud__field">
          <span>{labels.reading}</span>
          <select value={readingScope} onChange={(event) => setReadingScope(event.target.value)} disabled={active}>
            <option value="meaning">{labels.meaning}</option>
            <option value="full">{labels.full}</option>
          </select>
        </label>

        <label className="read-aloud__field">
          <span>{labels.speed}</span>
          <select value={rate} onChange={(event) => setRate(Number(event.target.value))} disabled={active}>
            {SPEEDS.map((speed) => <option key={speed.value} value={speed.value}>{speed.label}</option>)}
          </select>
        </label>

        {matchingVoices.length > 1 && (
          <label className="read-aloud__field read-aloud__field--voice">
            <span>{labels.voice}</span>
            <select value={voiceIndex} onChange={(event) => setVoiceIndex(event.target.value)} disabled={active}>
              <option value="">{labels.deviceDefault}</option>
              {matchingVoices.map((voice) => (
                <option key={`${voice.voiceURI}-${voice.index}`} value={voice.index}>{voice.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="read-aloud__status" aria-live="polite">
        {statusMessage || labels.quality}
      </p>

      {status === 'error' && Capacitor.getPlatform() === 'android' && (
        <button type="button" className="read-aloud__install" onClick={installVoice}>
          {labels.installVoice}
        </button>
      )}
    </section>
  );
}
