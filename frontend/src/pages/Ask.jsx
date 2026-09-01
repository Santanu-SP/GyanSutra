/**
 * Ask - the AI Q&A page.
 */

import AskPanel from '../components/AskPanel';
import useLanguage from '../i18n/useLanguage';
import './Ask.css';

const ASK_PAGE_COPY = {
  en: { title: 'Ask the Gita', intro: 'Ask about a passage or idea. Answers draw from the verses in this library and show the relevant references.', badge: 'Source verses included' },
  hi: { title: 'गीता से पूछें', intro: 'किसी अंश या विचार के बारे में पूछें। उत्तर इस पुस्तकालय के श्लोकों पर आधारित होते हैं और संबंधित संदर्भ दिखाते हैं।', badge: 'स्रोत श्लोक शामिल हैं' },
  bn: { title: 'গীতাকে জিজ্ঞাসা করুন', intro: 'কোনো অংশ বা ভাবনা সম্পর্কে জিজ্ঞাসা করুন। উত্তর এই গ্রন্থাগারের শ্লোকের ভিত্তিতে দেওয়া হয় এবং প্রাসঙ্গিক সূত্র দেখায়।', badge: 'উৎস শ্লোক অন্তর্ভুক্ত' },
  mr: { title: 'गीतेला विचारा', intro: 'एखाद्या उताऱ्याबद्दल किंवा कल्पनेबद्दल विचारा. उत्तरे या ग्रंथालयातील श्लोकांवर आधारित असून संबंधित संदर्भ दाखवतात.', badge: 'स्रोत श्लोक समाविष्ट' },
  te: { title: 'గీతను అడగండి', intro: 'ఒక భాగం లేదా భావం గురించి అడగండి. సమాధానాలు ఈ గ్రంథాలయంలోని శ్లోకాలపై ఆధారపడి సంబంధిత సూచనలను చూపుతాయి.', badge: 'మూల శ్లోకాలు చేర్చబడ్డాయి' },
  ta: { title: 'கீதையிடம் கேளுங்கள்', intro: 'ஒரு பகுதி அல்லது கருத்தைப் பற்றிக் கேளுங்கள். பதில்கள் இந்த நூலகத்தின் சுலோகங்களை அடிப்படையாகக் கொண்டு தொடர்புடைய குறிப்புகளைக் காட்டும்.', badge: 'மூலச் சுலோகங்கள் சேர்க்கப்பட்டுள்ளன' },
};

export default function Ask() {
  const { language } = useLanguage();
  const labels = ASK_PAGE_COPY[language] || ASK_PAGE_COPY.en;
  return (
    <main className="ask-page">
      <header className="ask-page__header">
        <span className="ask-page__eyebrow">ज्ञान सूत्र · Gyan Sutra</span>
        <h1 className="ask-page__heading">{labels.title}</h1>
        <p className="ask-page__subheading">
          {labels.intro}
        </p>
        <div className="ask-page__badge">
          <span className="ask-page__badge-dot" aria-hidden="true">✦</span>
          {labels.badge}
        </div>
      </header>
      <hr className="gold-rule" />
      <AskPanel />
    </main>
  );
}
