import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '../components/SEO/SEOHead';
import { FAQPageSchema, OrganizationSchema, WebApplicationSchema } from '../components/SEO/StructuredData';
import useLanguage from '../i18n/useLanguage';

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

const FAQ_COPY = {
  en: { title: 'Frequently Asked Questions', intro: 'Practical details about reading, search, Sarathi, and the app.', search: 'Search for answers…', categories: ['All', 'Reading', 'Sarathi', 'App'], none: 'No matching questions found.', clear: 'Clear filters' },
  hi: { title: 'अक्सर पूछे जाने वाले प्रश्न', intro: 'पढ़ने, खोज, सारथि और ऐप के बारे में उपयोगी जानकारी।', search: 'उत्तर खोजें…', categories: ['सभी', 'पढ़ना', 'सारथि', 'ऐप'], none: 'कोई मिलता-जुलता प्रश्न नहीं मिला।', clear: 'फ़िल्टर हटाएँ' },
  bn: { title: 'সাধারণ প্রশ্নাবলি', intro: 'পড়া, অনুসন্ধান, সারথি ও অ্যাপ সম্পর্কে ব্যবহারিক তথ্য।', search: 'উত্তর খুঁজুন…', categories: ['সব', 'পড়া', 'সারথি', 'অ্যাপ'], none: 'মিলছে এমন প্রশ্ন পাওয়া যায়নি।', clear: 'ফিল্টার সরান' },
  mr: { title: 'नेहमी विचारले जाणारे प्रश्न', intro: 'वाचन, शोध, सारथी आणि ॲपबद्दल उपयुक्त माहिती.', search: 'उत्तरे शोधा…', categories: ['सर्व', 'वाचन', 'सारथी', 'ॲप'], none: 'जुळणारे प्रश्न सापडले नाहीत.', clear: 'फिल्टर काढा' },
  te: { title: 'తరచుగా అడిగే ప్రశ్నలు', intro: 'చదవడం, శోధన, సారథి మరియు యాప్ గురించి ఉపయోగకరమైన వివరాలు.', search: 'సమాధానాలను వెతకండి…', categories: ['అన్నీ', 'చదవడం', 'సారథి', 'యాప్'], none: 'సరిపోలే ప్రశ్నలు దొరకలేదు.', clear: 'ఫిల్టర్లను తొలగించండి' },
  ta: { title: 'அடிக்கடி கேட்கப்படும் கேள்விகள்', intro: 'வாசிப்பு, தேடல், சாரதி மற்றும் செயலி பற்றிய பயனுள்ள விவரங்கள்.', search: 'பதில்களைத் தேடவும்…', categories: ['அனைத்தும்', 'வாசிப்பு', 'சாரதி', 'செயலி'], none: 'பொருந்தும் கேள்விகள் கிடைக்கவில்லை.', clear: 'வடிகட்டிகளை நீக்கவும்' },
};

const LOCALIZED_FAQ = {
  hi: [
    ['reading-1','Reading','मैं कौन-से ग्रंथ पढ़ सकता हूँ?','भगवद्गीता और वाल्मीकि रामायण अभी उपलब्ध हैं। उपनिषद, महाभारत और पुराण तैयारी में हैं।'],
    ['reading-2','Reading','हर श्लोक के साथ क्या मिलता है?','उपलब्ध प्रविष्टियों में देवनागरी संस्कृत, लिप्यंतरण, शब्दार्थ, उपलब्ध सत्यापित अनुवाद और व्याख्या हो सकती है।'],
    ['sarathi-1','Sarathi','सारथि क्या है?','सारथि इस पुस्तकालय के ग्रंथों से संबंधित अंश खोजकर सरल भाषा में समझाने वाला अध्ययन सहायक है।'],
    ['sarathi-2','Sarathi','क्या सारथि गलती कर सकता है?','हाँ। एआई की व्याख्या अधूरी या गलत हो सकती है। दिए गए श्लोक जाँचें और उत्तर को एकमात्र व्याख्या न मानें।'],
    ['sarathi-3','Sarathi','क्या सारथि पेशेवर सलाह देता है?','नहीं। यह शास्त्र अध्ययन के लिए है, चिकित्सा, कानूनी, वित्तीय या मानसिक स्वास्थ्य सलाह के लिए नहीं।'],
    ['app-1','App','क्या खाते की आवश्यकता है?','नहीं। पढ़ना, खोज और सारथि बिना खाता बनाए उपलब्ध हैं।'],
    ['app-3','App','क्या इंटरनेट के बिना पढ़ सकता हूँ?','पहले खोले गए कुछ पृष्ठ ऑफ़लाइन मिल सकते हैं। खोज और सारथि के लिए इंटरनेट चाहिए।'],
  ],
  bn: [
    ['reading-1','Reading','আমি কোন গ্রন্থগুলি পড়তে পারি?','ভগবদ্গীতা ও বাল্মীকি রামায়ণ এখন উপলব্ধ। উপনিষদ, মহাভারত ও পুরাণ প্রস্তুতিতে রয়েছে।'],
    ['reading-2','Reading','প্রতিটি শ্লোকের সঙ্গে কী থাকে?','উপলব্ধ অংশে দেবনাগরী সংস্কৃত, লিপ্যন্তর, শব্দার্থ, উপলব্ধ যাচাইকৃত অনুবাদ ও ব্যাখ্যা থাকতে পারে।'],
    ['sarathi-1','Sarathi','সারথি কী?','সারথি এই গ্রন্থাগারের পাঠ থেকে প্রাসঙ্গিক অংশ খুঁজে সহজ ভাষায় ব্যাখ্যা করা একটি অধ্যয়ন সহায়ক।'],
    ['sarathi-2','Sarathi','সারথি কি ভুল করতে পারে?','হ্যাঁ। এআই-এর ব্যাখ্যা অসম্পূর্ণ বা ভুল হতে পারে। উদ্ধৃত শ্লোক যাচাই করুন এবং উত্তরটিকে একমাত্র ব্যাখ্যা ভাববেন না।'],
    ['sarathi-3','Sarathi','সারথি কি পেশাদার পরামর্শ দেয়?','না। এটি শাস্ত্র অধ্যয়নের জন্য, চিকিৎসা, আইনি, আর্থিক বা মানসিক স্বাস্থ্য পরামর্শের জন্য নয়।'],
    ['app-1','App','আমার কি অ্যাকাউন্ট দরকার?','না। অ্যাকাউন্ট ছাড়াই পড়া, অনুসন্ধান ও সারথি ব্যবহার করা যায়।'],
    ['app-3','App','ইন্টারনেট ছাড়া কি পড়তে পারি?','আগে খোলা কিছু পৃষ্ঠা অফলাইনে থাকতে পারে। অনুসন্ধান ও সারথির জন্য সংযোগ প্রয়োজন।'],
  ],
  mr: [
    ['reading-1','Reading','मी कोणते ग्रंथ वाचू शकतो?','भगवद्गीता आणि वाल्मीकी रामायण सध्या उपलब्ध आहेत. उपनिषदे, महाभारत आणि पुराणे तयारीत आहेत.'],
    ['reading-2','Reading','प्रत्येक श्लोकासोबत काय मिळते?','उपलब्ध नोंदींमध्ये देवनागरी संस्कृत, लिप्यंतरण, शब्दार्थ, उपलब्ध सत्यापित अनुवाद आणि भाष्य असू शकते.'],
    ['sarathi-1','Sarathi','सारथी म्हणजे काय?','सारथी या ग्रंथालयातील ग्रंथांमधून संबंधित उतारे शोधून सोप्या भाषेत समजावणारा अभ्यास सहाय्यक आहे.'],
    ['sarathi-2','Sarathi','सारथी चुका करू शकतो का?','हो. एआयचे स्पष्टीकरण अपूर्ण किंवा चुकीचे असू शकते. उद्धृत श्लोक तपासा आणि उत्तराला एकमेव अर्थ मानू नका.'],
    ['sarathi-3','Sarathi','सारथी व्यावसायिक सल्ला देतो का?','नाही. तो धर्मग्रंथ अभ्यासासाठी आहे; वैद्यकीय, कायदेशीर, आर्थिक किंवा मानसिक आरोग्य सल्ल्यासाठी नाही.'],
    ['app-1','App','मला खाते आवश्यक आहे का?','नाही. खाते न बनवता वाचन, शोध आणि सारथी उपलब्ध आहेत.'],
    ['app-3','App','इंटरनेटशिवाय वाचता येते का?','आधी उघडलेली काही पाने ऑफलाइन उपलब्ध राहू शकतात. शोध आणि सारथीसाठी इंटरनेट आवश्यक आहे.'],
  ],
  te: [
    ['reading-1','Reading','నేను ఏ గ్రంథాలను చదవగలను?','భగవద్గీత మరియు వాల్మీకి రామాయణం ఇప్పుడు అందుబాటులో ఉన్నాయి. ఉపనిషత్తులు, మహాభారతం మరియు పురాణాలు సిద్ధమవుతున్నాయి.'],
    ['reading-2','Reading','ప్రతి శ్లోకంతో ఏమి ఉంటుంది?','అందుబాటులో ఉన్న నమోదుల్లో దేవనాగరి సంస్కృతం, లిప్యంతరీకరణ, పదార్థాలు, అందుబాటులో ఉన్న ధృవీకరించిన అనువాదం మరియు వ్యాఖ్యానం ఉండవచ్చు.'],
    ['sarathi-1','Sarathi','సారథి అంటే ఏమిటి?','సారథి ఈ గ్రంథాలయంలోని పాఠాల నుంచి సంబంధిత భాగాలను కనుగొని సరళంగా వివరించే అధ్యయన సహాయకుడు.'],
    ['sarathi-2','Sarathi','సారథి తప్పులు చేయగలడా?','అవును. ఏఐ వివరణ అసంపూర్ణంగా లేదా తప్పుగా ఉండవచ్చు. ఉదహరించిన శ్లోకాలను తనిఖీ చేసి, సమాధానాన్ని ఏకైక వ్యాఖ్యానంగా భావించవద్దు.'],
    ['sarathi-3','Sarathi','సారథి వృత్తిపరమైన సలహా ఇస్తాడా?','లేదు. ఇది శాస్త్ర అధ్యయనం కోసం మాత్రమే; వైద్య, న్యాయ, ఆర్థిక లేదా మానసిక ఆరోగ్య సలహా కోసం కాదు.'],
    ['app-1','App','నాకు ఖాతా అవసరమా?','లేదు. ఖాతా సృష్టించకుండానే చదవడం, శోధన మరియు సారథి అందుబాటులో ఉన్నాయి.'],
    ['app-3','App','ఇంటర్నెట్ లేకుండా చదవగలనా?','ముందు తెరిచిన కొన్ని పుటలు ఆఫ్‌లైన్‌లో ఉండవచ్చు. శోధన మరియు సారథికి కనెక్షన్ అవసరం.'],
  ],
  ta: [
    ['reading-1','Reading','நான் எந்த நூல்களைப் படிக்கலாம்?','பகவத் கீதையும் வால்மீகி இராமாயணமும் இப்போது கிடைக்கின்றன. உபநிடதங்கள், மகாபாரதம் மற்றும் புராணங்கள் தயாரிப்பில் உள்ளன.'],
    ['reading-2','Reading','ஒவ்வொரு சுலோகத்துடனும் என்ன கிடைக்கும்?','கிடைக்கும் பதிவுகளில் தேவநாகரி சமஸ்கிருதம், ஒலிபெயர்ப்பு, சொற்பொருள், கிடைக்கும் சரிபார்க்கப்பட்ட மொழிபெயர்ப்பு மற்றும் விளக்கவுரை இருக்கலாம்.'],
    ['sarathi-1','Sarathi','சாரதி என்றால் என்ன?','சாரதி இந்த நூலகத்தின் நூல்களில் தொடர்புடைய பகுதிகளைக் கண்டறிந்து எளிய மொழியில் விளக்கும் படிப்பு உதவியாளர்.'],
    ['sarathi-2','Sarathi','சாரதி தவறு செய்யுமா?','ஆம். ஏஐ விளக்கம் முழுமையற்றதாகவோ தவறாகவோ இருக்கலாம். மேற்கோள் சுலோகங்களைச் சரிபார்த்து, பதிலை ஒரே விளக்கமாகக் கருத வேண்டாம்.'],
    ['sarathi-3','Sarathi','சாரதி தொழில்முறை ஆலோசனை தருமா?','இல்லை. இது சாஸ்திரப் படிப்புக்கானது; மருத்துவ, சட்ட, நிதி அல்லது மனநல ஆலோசனைக்கானது அல்ல.'],
    ['app-1','App','எனக்கு கணக்கு தேவையா?','இல்லை. கணக்கு உருவாக்காமல் வாசிப்பு, தேடல் மற்றும் சாரதியைப் பயன்படுத்தலாம்.'],
    ['app-3','App','இணையம் இல்லாமல் படிக்க முடியுமா?','முன்பு திறந்த சில பக்கங்கள் இணையமின்றி கிடைக்கலாம். தேடலுக்கும் சாரதிக்கும் இணைப்பு தேவை.'],
  ],
};

Object.keys(LOCALIZED_FAQ).forEach((language) => {
  LOCALIZED_FAQ[language] = LOCALIZED_FAQ[language].map(([id, category, question, answer]) => ({ id, category, question, answer }));
});

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
  const { language } = useLanguage();
  const labels = FAQ_COPY[language] || FAQ_COPY.en;
  const faqData = LOCALIZED_FAQ[language] || FAQ_DATA;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openItemId, setOpenItemId] = useState(null);

  // Filter logic
  const filteredData = useMemo(() => {
    return faqData.filter(item => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory, faqData]);

  const handleToggle = (id) => {
    setOpenItemId(prev => prev === id ? null : id);
  };

  // Structured Data Object
  const schemaData = [
    OrganizationSchema(),
    WebApplicationSchema(),
    FAQPageSchema(faqData)
  ];

  return (
    <main className="relative min-h-screen px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <SEOHead
        title={labels.title}
        description={labels.intro}
        canonical="/faq"
        schemaData={schemaData}
      />

      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="mb-4 font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[color:var(--text-primary)]">
            {labels.title}
          </h1>
          <p className="text-[color:var(--text-secondary)]">
            {labels.intro}
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
              placeholder={labels.search}
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
                {labels.categories[CATEGORIES.indexOf(category)]}
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
              <p>{labels.none}</p>
              <button 
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="mt-4 text-amber-500 hover:underline"
              >
                {labels.clear}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
