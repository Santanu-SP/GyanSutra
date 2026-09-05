import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

import { buildNarration, LANGUAGE_LOCALES, rankedVoices } from '../utils/narration';
import { startNarrationSession } from '../services/readAloud';
import { getVerseRecording, RAMAYANA_COLLECTION } from '../utils/recitations';
import './ReadAloudControls.css';

const COPY = {
  en: {
    meaningIntro: 'Now, the meaning', explanationIntro: 'Let us understand this further', contextIntro: 'Here is the context',
    verse: 'Shloka', fallback: 'Natural voice unavailable. Using a device voice.', sequence: 'Shloka first, then its meaning, with pauses between sections.',
    listen: 'Listen', stop: 'Stop', speed: 'Speed', voice: 'Voice', deviceDefault: 'Natural narration (automatic)',
    reading: 'Reading', meaning: 'Verse & meaning', full: 'Include explanation',
    preparing: 'Preparing the reading…', playing: 'Reading aloud', error: 'Read aloud could not start on this device.',
    missingVoice: 'A reading voice for this language is not installed.', installVoice: 'Install a voice',
    translation: 'Translation', explanation: 'Explanation', context: 'Context', quality: 'Voice quality depends on the speech voices installed on this device.',
  },
  hi: {
    meaningIntro: 'अब इसका अर्थ सुनिए', explanationIntro: 'आइए इसे विस्तार से समझें', contextIntro: 'अब इसका प्रसंग सुनिए',
    verse: 'श्लोक', fallback: 'सहज आवाज़ उपलब्ध नहीं है। डिवाइस की आवाज़ से वाचन हो रहा है।', sequence: 'पहले श्लोक, फिर अर्थ, हर भाग के बीच विराम के साथ।',
    listen: 'सुनें', stop: 'रोकें', speed: 'गति', voice: 'आवाज़', deviceDefault: 'सहज वाचन (स्वचालित)',
    reading: 'वाचन', meaning: 'श्लोक और अर्थ', full: 'व्याख्या सहित',
    preparing: 'पाठ तैयार हो रहा है…', playing: 'पाठ सुनाया जा रहा है', error: 'इस डिवाइस पर वाचन शुरू नहीं हो सका।',
    missingVoice: 'इस भाषा की वाचन आवाज़ इंस्टॉल नहीं है।', installVoice: 'आवाज़ इंस्टॉल करें',
    translation: 'अनुवाद', explanation: 'व्याख्या', context: 'प्रसंग', quality: 'आवाज़ की गुणवत्ता इस डिवाइस पर इंस्टॉल की गई वाचन आवाज़ों पर निर्भर करती है।',
  },
  bn: {
    meaningIntro: 'এবার এর অর্থ শুনুন', explanationIntro: 'আসুন আরও বিস্তারিতভাবে বুঝি', contextIntro: 'এবার এর প্রসঙ্গ শুনুন',
    verse: 'শ্লোক', fallback: 'স্বাভাবিক কণ্ঠ উপলব্ধ নেই। ডিভাইসের কণ্ঠ ব্যবহার করা হচ্ছে।', sequence: 'প্রথমে শ্লোক, তারপর অর্থ, প্রতিটি অংশের মাঝে বিরতি দিয়ে।',
    listen: 'শুনুন', stop: 'বন্ধ করুন', speed: 'গতি', voice: 'কণ্ঠ', deviceDefault: 'স্বাভাবিক পাঠ (স্বয়ংক্রিয়)',
    reading: 'পাঠ', meaning: 'শ্লোক ও অর্থ', full: 'ব্যাখ্যাসহ',
    preparing: 'পাঠ প্রস্তুত হচ্ছে…', playing: 'পাঠ শোনানো হচ্ছে', error: 'এই ডিভাইসে পাঠ শোনানো শুরু করা যায়নি।',
    missingVoice: 'এই ভাষার পাঠকণ্ঠ ইনস্টল করা নেই।', installVoice: 'কণ্ঠ ইনস্টল করুন',
    translation: 'অনুবাদ', explanation: 'ব্যাখ্যা', context: 'প্রসঙ্গ', quality: 'কণ্ঠের স্বাভাবিকতা এই ডিভাইসে ইনস্টল করা কণ্ঠগুলির উপর নির্ভর করে।',
  },
  mr: {
    meaningIntro: 'आता याचा अर्थ ऐकूया', explanationIntro: 'चला हे अधिक सविस्तर समजून घेऊया', contextIntro: 'आता याचा संदर्भ ऐकूया',
    verse: 'श्लोक', fallback: 'सहज आवाज उपलब्ध नाही. डिवाइसचा आवाज वापरत आहे.', sequence: 'प्रथम श्लोक, नंतर अर्थ, प्रत्येक भागात विरामासह.',
    listen: 'ऐका', stop: 'थांबवा', speed: 'गती', voice: 'आवाज', deviceDefault: 'सहज वाचन (स्वयंचलित)',
    reading: 'वाचन', meaning: 'श्लोक आणि अर्थ', full: 'स्पष्टीकरणासह',
    preparing: 'वाचन तयार होत आहे…', playing: 'वाचन सुरू आहे', error: 'या डिवाइसवर वाचन सुरू करता आले नाही.',
    missingVoice: 'या भाषेचा वाचन आवाज इंस्टॉल केलेला नाही.', installVoice: 'आवाज इंस्टॉल करा',
    translation: 'अनुवाद', explanation: 'स्पष्टीकरण', context: 'संदर्भ', quality: 'आवाजाची नैसर्गिकता या डिवाइसवर इंस्टॉल केलेल्या आवाजांवर अवलंबून असते.',
  },
  te: {
    meaningIntro: 'ఇప్పుడు దీని అర్థం వినండి', explanationIntro: 'దీన్ని మరింత వివరంగా తెలుసుకుందాం', contextIntro: 'ఇప్పుడు దీని సందర్భం వినండి',
    verse: 'శ్లోకం', fallback: 'సహజ స్వరం అందుబాటులో లేదు. పరికరం స్వరం ఉపయోగిస్తోంది.', sequence: 'ముందుగా శ్లోకం, తర్వాత అర్థం, భాగాల మధ్య విరామంతో.',
    listen: 'వినండి', stop: 'ఆపండి', speed: 'వేగం', voice: 'స్వరం', deviceDefault: 'సహజ పఠనం (స్వయంచాలకం)',
    reading: 'పఠనం', meaning: 'శ్లోకం మరియు అర్థం', full: 'వివరణతో',
    preparing: 'పఠనం సిద్ధమవుతోంది…', playing: 'చదివి వినిపిస్తోంది', error: 'ఈ పరికరంలో చదివి వినిపించడం ప్రారంభించలేకపోయాం.',
    missingVoice: 'ఈ భాషకు సంబంధించిన పఠన స్వరం ఇన్‌స్టాల్ కాలేదు.', installVoice: 'స్వరాన్ని ఇన్‌స్టాల్ చేయండి',
    translation: 'అనువాదం', explanation: 'వివరణ', context: 'సందర్భం', quality: 'స్వరం సహజంగా వినిపించడం ఈ పరికరంలో ఇన్‌స్టాల్ చేసిన స్వరాలపై ఆధారపడి ఉంటుంది.',
  },
  ta: {
    meaningIntro: 'இப்போது இதன் பொருளைக் கேளுங்கள்', explanationIntro: 'இதை மேலும் விரிவாகப் புரிந்துகொள்வோம்', contextIntro: 'இப்போது இதன் சூழலைக் கேளுங்கள்',
    verse: 'சுலோகம்', fallback: 'இயல்பான குரல் கிடைக்கவில்லை. சாதனத்தின் குரல் பயன்படுத்தப்படுகிறது.', sequence: 'முதலில் சுலோகம், பின்னர் பொருள், பகுதிகளுக்கு இடையே இடைவெளியுடன்.',
    listen: 'கேளுங்கள்', stop: 'நிறுத்தவும்', speed: 'வேகம்', voice: 'குரல்', deviceDefault: 'இயல்பான வாசிப்பு (தானியங்கி)',
    reading: 'வாசிப்பு', meaning: 'சுலோகமும் பொருளும்', full: 'விளக்கத்துடன்',
    preparing: 'வாசிப்பு தயாராகிறது…', playing: 'வாசித்துக் கொண்டிருக்கிறது', error: 'இந்தச் சாதனத்தில் வாசிப்பைத் தொடங்க முடியவில்லை.',
    missingVoice: 'இந்த மொழிக்கான வாசிப்புக் குரல் நிறுவப்படவில்லை.', installVoice: 'குரலை நிறுவவும்',
    translation: 'மொழிபெயர்ப்பு', explanation: 'விளக்கம்', context: 'சூழல்', quality: 'குரலின் இயல்பான தன்மை இந்தச் சாதனத்தில் நிறுவப்பட்டுள்ள குரல்களைப் பொறுத்தது.',
  },
};

const CONTENT_LANGUAGE_CODES = {
  english: 'en', hindi: 'hi', bengali: 'bn', marathi: 'mr', telugu: 'te', tamil: 'ta',
};
const RECITATION_COPY = {
  en: { automatic: 'Best available device voice', voice: 'Meaning voice', recorded: 'Human recitation', device: 'Device voice', failed: 'Recording unavailable. Reading the shloka with a device voice.', credit: 'Recitation', collection: 'Human Ramayana recordings by sarga (Internet Archive)' },
  hi: { automatic: 'उपलब्ध सर्वोत्तम डिवाइस आवाज़', voice: 'अर्थ की आवाज़', recorded: 'मानव स्वर में पाठ', device: 'डिवाइस की आवाज़', failed: 'रिकॉर्डिंग उपलब्ध नहीं है। डिवाइस की आवाज़ से श्लोक पढ़ा जा रहा है।', credit: 'पाठ', collection: 'सर्ग अनुसार रामायण का मानव स्वर में पाठ (Internet Archive)' },
  bn: { automatic: 'সেরা উপলব্ধ ডিভাইস কণ্ঠ', voice: 'অর্থের কণ্ঠ', recorded: 'মানবকণ্ঠে আবৃত্তি', device: 'ডিভাইসের কণ্ঠ', failed: 'রেকর্ডিং পাওয়া যাচ্ছে না। ডিভাইসের কণ্ঠে শ্লোক পড়া হচ্ছে।', credit: 'আবৃত্তি', collection: 'সর্গ অনুযায়ী মানবকণ্ঠে রামায়ণ পাঠ (Internet Archive)' },
  mr: { automatic: 'उपलब्ध सर्वोत्तम डिवाइस आवाज', voice: 'अर्थाचा आवाज', recorded: 'मानवी आवाजातील पठण', device: 'डिवाइसचा आवाज', failed: 'रेकॉर्डिंग उपलब्ध नाही. डिवाइसच्या आवाजात श्लोक वाचत आहे.', credit: 'पठण', collection: 'सर्गानुसार रामायणाचे मानवी पठण (Internet Archive)' },
  te: { automatic: 'అందుబాటులో ఉన్న ఉత్తమ పరికరం స్వరం', voice: 'అర్థం చదివే స్వరం', recorded: 'మానవ స్వరంలో పఠనం', device: 'పరికరం స్వరం', failed: 'రికార్డింగ్ అందుబాటులో లేదు. పరికరం స్వరంతో శ్లోకం చదువుతోంది.', credit: 'పఠనం', collection: 'సర్గాల వారీగా మానవ స్వరంలో రామాయణ పఠనం (Internet Archive)' },
  ta: { automatic: 'கிடைக்கும் சிறந்த சாதனக் குரல்', voice: 'பொருளை வாசிக்கும் குரல்', recorded: 'மனிதக் குரலில் பாராயணம்', device: 'சாதனத்தின் குரல்', failed: 'பதிவு கிடைக்கவில்லை. சாதனத்தின் குரலில் சுலோகம் வாசிக்கப்படுகிறது.', credit: 'பாராயணம்', collection: 'சர்க்கம் வாரியாக மனிதக் குரலில் இராமாயணப் பாராயணம் (Internet Archive)' },
};
const SPEEDS = [
  { value: 0.8, label: '0.8×' },
  { value: 0.95, label: '0.95×' },
  { value: 1.1, label: '1.1×' },
];

export default function ReadAloudControls({
  verseKey,
  book,
  chapterNumber,
  verseNumber,
  sanskrit,
  translation,
  explanation,
  context,
  language,
  contentLanguage,
  disabled = false,
}) {
  const labels = COPY[language] || COPY.en;
  const audioLabels = RECITATION_COPY[language] || RECITATION_COPY.en;
  const recording = getVerseRecording({ book, chapterNumber, verseNumber });
  const spokenLabels = COPY[CONTENT_LANGUAGE_CODES[contentLanguage]] || COPY.en;
  const preferredLocale = LANGUAGE_LOCALES[contentLanguage] || 'en-IN';
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [rate, setRate] = useState(0.95);
  const [readingScope, setReadingScope] = useState('meaning');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [progress, setProgress] = useState(null);
  const [fallback, setFallback] = useState(false);
  const [audioSource, setAudioSource] = useState('device');
  const sessionRef = useRef(null);

  const matchingVoices = useMemo(() => rankedVoices(voices, preferredLocale), [preferredLocale, voices]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      TextToSpeech.getSupportedVoices().then((result) => {
        if (active) setVoices(result.voices || []);
      }).catch(() => {});
    };
    refresh();
    window.speechSynthesis?.addEventListener('voiceschanged', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.speechSynthesis?.removeEventListener('voiceschanged', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => { setSelectedVoice(''); }, [contentLanguage]);

  useEffect(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus('idle');
    setError('');
    setProgress(null);
    setFallback(false);
    return () => { sessionRef.current?.stop(); sessionRef.current = null; };
  }, [verseKey, book, chapterNumber, verseNumber, sanskrit, translation, explanation, context, contentLanguage, language, disabled]);

  const listen = async () => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
      return;
    }
    const segments = buildNarration({
      sanskrit, translation, explanation, context, contentLanguage,
      full: readingScope === 'full', labels: spokenLabels,
    });
    if (!segments.length) { setError(labels.error); setStatus('error'); return; }
    setError('');
    setFallback(false);
    setStatus('preparing');
    setAudioSource(recording ? 'recording' : 'device');
    const session = startNarrationSession(() => {
      if (sessionRef.current === session) {
        sessionRef.current = null;
        setStatus('idle');
        setProgress(null);
      }
    });
    sessionRef.current = session;
    try {
      await session.play(segments, {
        voices, selectedVoice, rate, recording,
        onSource: setAudioSource,
        onSegment: (segment, index, total, phase) => {
          if (sessionRef.current !== session) return;
          setStatus(phase);
          setProgress({ kind: segment.kind, index: index + 1, total });
        },
        onFallback: (reason) => setFallback(reason),
      });
      if (sessionRef.current === session) session.stop();
    } catch (failure) {
      if (session.signal.aborted || sessionRef.current !== session) return;
      session.stop();
      setError(failure.message === 'MISSING_VOICE' ? labels.missingVoice : labels.error);
      setStatus('error');
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
          disabled={disabled && !active}
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

        {matchingVoices.length > 0 && (
          <label className="read-aloud__field read-aloud__field--voice">
            <span>{audioLabels.voice}</span>
            <select value={selectedVoice} onChange={(event) => setSelectedVoice(event.target.value)} disabled={active}>
              <option value="">{audioLabels.automatic}</option>
              {matchingVoices.map((voice) => (
                <option key={`${voice.voiceURI}-${voice.index}`} value={voice.voiceURI}>{voice.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="read-aloud__status" aria-live="polite">
        {statusMessage || labels.sequence}
        {active && progress && ` · ${labels[progress.kind]} · ${audioSource === 'recording' ? audioLabels.recorded : audioLabels.device}`}
        {active && fallback && ` ${fallback === 'recording' ? audioLabels.failed : labels.fallback}`}
      </p>

      {recording && (
        <p className="read-aloud__credit">
          {audioLabels.credit}: <a href={recording.sourceURL} target="_blank" rel="noopener noreferrer">{recording.artist}</a>
          {' · '}<a href={recording.licenseURL} target="_blank" rel="noopener noreferrer">{recording.license}</a>
          {' · '}{audioLabels.voice}: {audioLabels.device}
        </p>
      )}
      {book === 'ramayana' && (
        <p className="read-aloud__credit">
          <a href={RAMAYANA_COLLECTION.sourceURL} target="_blank" rel="noopener noreferrer"
            onClick={() => sessionRef.current?.stop()}>{audioLabels.collection}</a>
          {' · '}{RAMAYANA_COLLECTION.artist}
        </p>
      )}

      {status === 'error' && Capacitor.getPlatform() === 'android' && (
        <button type="button" className="read-aloud__install" onClick={installVoice}>
          {labels.installVoice}
        </button>
      )}
    </section>
  );
}
