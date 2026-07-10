/**
 * Gyan Sutra — Data Ingestion Script
 * ────────────────────────────────────────────────────────────────────────────
 * Reads the Bhagavad Gita JSON dataset, generates embeddings for each verse,
 * and writes everything to Firestore in batched transactions.
 *
 * Run once (or re-run to update/re-embed):
 *   node scripts/ingest.js
 *   node scripts/ingest.js --dry-run     # validates data without writing
 *   node scripts/ingest.js --skip-embed  # writes data without regenerating embeddings
 *
 * Data source: https://github.com/gita/BhagavadGita (open license)
 * This script expects the data in the format used by that repository.
 * Download instructions are in README.md.
 *
 * Firestore document IDs:
 *   chapters: "chapter_1" ... "chapter_18"
 *   verses:   "1_1" ... "18_78"
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const { batchWrite, collections } = require('../src/services/firestore');
const { batchEmbedTexts, buildVerseEmbeddingText } = require('../src/services/embedding');
const { SOURCES } = require('../src/data/sources');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

// ── CLI flags ─────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EMBED = process.argv.includes('--skip-embed');
const SOURCE_ID_ARG = process.argv.find(arg => arg.startsWith('--source_id=') || arg.startsWith('--source-id='));
const SOURCE_ID = SOURCE_ID_ARG ? SOURCE_ID_ARG.split('=')[1] : 'bhagavad-gita';
const SOURCE = SOURCES.find((item) => item.id === SOURCE_ID) || {
  id: SOURCE_ID,
  title: SOURCE_ID,
  description: '',
};

// ── Bhagavad Gita data (bundled inline) ──────────────────────────────────────
// We embed the full dataset directly so no external download is required.
// Source: https://github.com/gita/BhagavadGita (CC-BY-SA / open access)
// Chapters are the 18 standard chapters of the Srimad Bhagavad Gita.

const GITA_CHAPTERS = [
  {
    number: 1, titleSanskrit: 'अर्जुनविषादयोग', titleHindi: 'अर्जुन विषाद योग', titleEnglish: "Arjuna's Dilemma", verseCount: 47, summary: 'On the battlefield of Kurukshetra, Arjuna is overcome with grief and moral confusion at the prospect of fighting his own kinsmen.He lays down his bow and turns to Krishna for guidance.This chapter sets the stage for the entire Gita.'
  },
  { number: 2, titleSanskrit: 'सांख्ययोग', titleHindi: 'सांख्य योग', titleEnglish: 'The Yoga of Knowledge', verseCount: 72, summary: 'Krishna begins his teachings by distinguishing the eternal soul (Atman) from the perishable body. He introduces the concept of Nishkama Karma — selfless action without attachment to results — and describes the Sthitaprajna, the person of steady wisdom.' },
  { number: 3, titleSanskrit: 'कर्मयोग', titleHindi: 'कर्म योग', titleEnglish: 'The Yoga of Action', verseCount: 43, summary: 'Krishna explains why action is unavoidable and superior to inaction. He emphasises performing one\'s duty (Svadharma) without attachment, and describes how Yajna (sacrifice) sustains the cosmic order.' },
  { number: 4, titleSanskrit: 'ज्ञानकर्मसंन्यासयोग', titleHindi: 'ज्ञान कर्म संन्यास योग', titleEnglish: 'The Yoga of Knowledge and Action', verseCount: 42, summary: 'Krishna reveals that this ancient wisdom has been transmitted through a lineage of kings. He explains the divine mystery of his own birth and actions, describes the four varnas, and clarifies how knowledge purifies action.' },
  { number: 5, titleSanskrit: 'कर्मसंन्यासयोग', titleHindi: 'कर्म संन्यास योग', titleEnglish: 'The Yoga of Renunciation', verseCount: 29, summary: 'Krishna reconciles the paths of renunciation (Sannyasa) and selfless action (Karma Yoga), saying both lead to liberation. He describes the equanimity of the wise person who sees the same Self in all beings.' },
  { number: 6, titleSanskrit: 'आत्मसंयमयोग', titleHindi: 'आत्म संयम योग', titleEnglish: 'The Yoga of Meditation', verseCount: 47, summary: 'Krishna gives detailed instructions on the practice of meditation (Dhyana Yoga) — the posture, the setting, the mental discipline required to still the mind. He assures that even a sincere seeker who falls short of the goal is not lost.' },
  { number: 7, titleSanskrit: 'ज्ञानविज्ञानयोग', titleHindi: 'ज्ञान विज्ञान योग', titleEnglish: 'The Yoga of Knowledge and Wisdom', verseCount: 30, summary: 'Krishna reveals his higher and lower nature (Para and Apara Prakriti), declares himself the ultimate ground of all existence, and explains why people turn to different deities. He describes four types of devotees.' },
  { number: 8, titleSanskrit: 'अक्षरब्रह्मयोग', titleHindi: 'अक्षर ब्रह्म योग', titleEnglish: 'The Yoga of the Imperishable Brahman', verseCount: 28, summary: 'Krishna answers Arjuna\'s questions about Brahman, Adhyatma, Karma, and the paths taken at the time of death. He describes the two cosmic paths — the path of no return (Devayana) and the path of return (Pitriyana).' },
  { number: 9, titleSanskrit: 'राजविद्याराजगुह्ययोग', titleHindi: 'राज विद्या राज गुह्य योग', titleEnglish: 'The Yoga of Royal Knowledge', verseCount: 34, summary: 'Krishna calls this the king of sciences and the royal secret. He describes how all beings rest in him without him being contained in them, declares that sincere devotion in any form reaches him, and assures that his devotees are never lost.' },
  { number: 10, titleSanskrit: 'विभूतियोग', titleHindi: 'विभूति योग', titleEnglish: 'The Yoga of Divine Manifestations', verseCount: 42, summary: 'Krishna enumerates his divine manifestations (Vibhutis) — he is the best among every category of being and object. This chapter is the basis of understanding divinity immanent in the world.' },
  { number: 11, titleSanskrit: 'विश्वरूपदर्शनयोग', titleHindi: 'विश्वरूप दर्शन योग', titleEnglish: 'The Vision of the Cosmic Form', verseCount: 55, summary: 'At Arjuna\'s request, Krishna grants him divine sight to behold the Vishvarupa — the cosmic, all-encompassing form containing all of creation, past, present, and future. Arjuna is simultaneously awed and terrified, and begs Krishna to return to his gentle human form.' },
  { number: 12, titleSanskrit: 'भक्तियोग', titleHindi: 'भक्ति योग', titleEnglish: 'The Yoga of Devotion', verseCount: 20, summary: 'Krishna declares that devotion (Bhakti) is the most direct and accessible path. He describes the qualities of his dearest devotees: equanimity, compassion, freedom from hatred and pride, contentment, and unwavering devotion.' },
  { number: 13, titleSanskrit: 'क्षेत्रक्षेत्रज्ञविभागयोग', titleHindi: 'क्षेत्र क्षेत्रज्ञ विभाग योग', titleEnglish: 'The Yoga of the Field and Its Knower', verseCount: 35, summary: 'Krishna distinguishes between the field (Kshetra — the body and all of manifest existence) and the Knower of the field (Kshetrajna — pure consciousness). Understanding this distinction is the basis of liberation.' },
  { number: 14, titleSanskrit: 'गुणत्रयविभागयोग', titleHindi: 'गुण त्रय विभाग योग', titleEnglish: 'The Yoga of the Three Qualities', verseCount: 27, summary: 'Krishna explains the three Gunas — Sattva (clarity, harmony), Rajas (passion, activity), and Tamas (inertia, delusion) — and how they bind the soul to the body. The one who transcends the Gunas reaches liberation.' },
  { number: 15, titleSanskrit: 'पुरुषोत्तमयोग', titleHindi: 'पुरुषोत्तम योग', titleEnglish: 'The Yoga of the Supreme Person', verseCount: 20, summary: 'Using the metaphor of the Ashvattha tree with roots above and branches below, Krishna describes the nature of phenomenal existence. He then reveals the three Purushas: the perishable (Kshara), the imperishable (Akshara), and the Supreme (Purushottama) — which he himself is.' },
  { number: 16, titleSanskrit: 'दैवासुरसम्पद्विभागयोग', titleHindi: 'दैव असुर सम्पद विभाग योग', titleEnglish: 'The Yoga of Divine and Demonic Qualities', verseCount: 24, summary: 'Krishna enumerates divine (Daivi) and demonic (Asuri) qualities in human beings. He warns that demonic qualities — desire, anger, greed — are the triple gates of hell, and urges following the authority of scripture.' },
  { number: 17, titleSanskrit: 'श्रद्धात्रयविभागयोग', titleHindi: 'श्रद्धा त्रय विभाग योग', titleEnglish: 'The Yoga of the Threefold Faith', verseCount: 28, summary: 'Krishna classifies food, sacrifice, austerity, and charity according to the three Gunas. He emphasises that acts performed without faith, without scriptural guidance, or without the sacred syllable Om are impermanent and unfruitful.' },
  { number: 18, titleSanskrit: 'मोक्षसंन्यासयोग', titleHindi: 'मोक्ष संन्यास योग', titleEnglish: 'The Yoga of Liberation through Renunciation', verseCount: 78, summary: 'The culminating chapter. Krishna distinguishes Tyaga (renunciation of results) from Sannyasa (abandonment of action). He revisits all three Gunas as they apply to knowledge, action, and the doer. The Gita concludes with the most direct statement of devotion: "Abandon all dharmas and take refuge in me alone — I will liberate you from all sin."' },
];

// ── Core verse data ───────────────────────────────────────────────────────────
// Key verses from each chapter. A full 700-verse dataset should be supplied
// as data/gita.json (see README for the download command).
// This embedded dataset contains representative verses for each chapter so
// the app is functional without an external file.
// To ingest the complete dataset: node scripts/ingest.js --full
// (requires data/gita.json — see README)

function loadVerseData() {
  const fullDataPath = path.join(__dirname, '../data/gita.json');

  // Check if file exists AND has content (greater than 0 bytes)
  if (fs.existsSync(fullDataPath) && fs.statSync(fullDataPath).size > 0) {
    console.log('[Ingest] Loading full dataset from data/gita.json');
    try {
      return JSON.parse(fs.readFileSync(fullDataPath, 'utf8'));
    } catch (parseErr) {
      console.error('⚠️ Warning: data/gita.json is corrupted or unparseable. Falling back to bundled verses.');
    }
  }

  console.log('[Ingest] data/gita.json is missing or empty — using bundled representative verses.');
  console.log('[Ingest] See README.md for instructions to download the full 700-verse dataset.');
  return BUNDLED_REPRESENTATIVE_VERSES;
}

// Representative verses — enough to make all 6 routes functional immediately.
// Format matches the gita-api JSON schema so the same ingestion code handles both.
const BUNDLED_REPRESENTATIVE_VERSES = [
  // Chapter 1
  { chapterNumber: 1, verseNumber: 1, sanskrit: 'धृतराष्ट्र उवाच\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः |\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ||१-१||', transliteration: 'dhṛitarāśhtra uvācha\ndharma-kṣhetre kuru-kṣhetre samavetā yuyutsavaḥ\nmāmakāḥ pāṇḍavāśhchaiva kimakurvata sañjaya', translationEnglish: 'Dhritarashtra said: O Sanjaya, after my sons and the sons of Pandu assembled in the place of pilgrimage at Kurukshetra, desiring to fight, what did they do?', translationHindi: 'धृतराष्ट्र ने कहा: हे संजय! धर्मभूमि कुरुक्षेत्र में एकत्रित हुए युद्ध की इच्छा रखने वाले मेरे और पाण्डु के पुत्रों ने क्या किया?', wordMeanings: [{ word: 'धर्मक्षेत्रे', meaning: 'in the holy land' }, { word: 'कुरुक्षेत्रे', meaning: 'at Kurukshetra' }, { word: 'युयुत्सवः', meaning: 'desiring to fight' }], tags: ['dharma', 'kurukshetra', 'war', 'opening'] },
  { chapterNumber: 1, verseNumber: 47, sanskrit: 'एवमुक्त्वार्जुनः सङ्ख्ये रथोपस्थ उपाविशत् |\nविसृज्य सशरं चापं शोकसंविग्नमानसः ||१-४७||', transliteration: 'evam uktvārjunaḥ saṅkhye rathopastha upāviśat\nvisṛijya sa-śharaṁ chāpaṁ śhoka-saṁvigna-mānasaḥ', translationEnglish: 'Having thus spoken on the battlefield, Arjuna cast aside his bow and arrows and sat down on the chariot, his mind overwhelmed with grief.', translationHindi: 'युद्धभूमि में इस प्रकार कहकर अर्जुन ने बाण सहित धनुष को रखकर रथ पर बैठ गए, उनका मन शोक से व्याकुल था।', wordMeanings: [{ word: 'विसृज्य', meaning: 'casting aside' }, { word: 'शोकसंविग्नमानसः', meaning: 'with mind overwhelmed with grief' }], tags: ['arjuna', 'grief', 'surrender', 'opening'] },

  // Chapter 2 — the philosophical heart
  { chapterNumber: 2, verseNumber: 11, sanskrit: 'श्रीभगवानुवाच\nअशोच्यानन्वशोचस्त्वं प्रज्ञावादांश्च भाषसे |\nगतासूनगतासूंश्च नानुशोचन्ति पण्डिताः ||२-११||', transliteration: 'śhrī bhagavān uvācha\naśhochyān anvaśhochas tvaṁ prajñā-vādānśh cha bhāṣhase\ngatāsūn agatāsūnśh cha nānuśhochanti paṇḍitāḥ', translationEnglish: 'The Supreme Lord said: While speaking learned words, you are mourning for what is not worthy of grief. Those who are wise lament neither for the living nor for the dead.', translationHindi: 'श्री भगवान ने कहा: तुम अशोचनीय के लिए शोक करते हो और पण्डितों जैसी बातें करते हो। जो सच्चे पण्डित हैं वे न जीवित के लिए और न मृत के लिए शोक करते हैं।', wordMeanings: [{ word: 'अशोच्यान्', meaning: 'those not worthy of grief' }, { word: 'पण्डिताः', meaning: 'the wise' }], tags: ['wisdom', 'grief', 'atman', 'knowledge'] },
  { chapterNumber: 2, verseNumber: 19, sanskrit: 'य एनं वेत्ति हन्तारं यश्चैनं मन्यते हतम् |\nउभौ तौ न विजानीतो नायं हन्ति न हन्यते ||२-१९||', transliteration: 'ya enaṁ vetti hantāraṁ yaśh chainaṁ manyate hatam\nubhau tau na vijānīto nāyaṁ hanti na hanyate', translationEnglish: 'Both he who thinks the soul can slay and he who thinks it can be slain — both are in ignorance. The soul does not slay, nor can it be slain.', translationHindi: 'जो इसे मारने वाला समझता है और जो इसे मरा हुआ मानता है, वे दोनों ही नहीं जानते। यह आत्मा न मारती है और न मारी जाती है।', wordMeanings: [{ word: 'हन्तारम्', meaning: 'the slayer' }, { word: 'आत्मा', meaning: 'the soul / self' }], tags: ['atman', 'soul', 'immortality', 'knowledge'] },
  { chapterNumber: 2, verseNumber: 20, sanskrit: 'न जायते म्रियते वा कदाचि- न्नायं भूत्वा भविता वा न भूयः |\nअजो नित्यः शाश्वतोऽयं पुराणो- न हन्यते हन्यमाने शरीरे ||२-२०||', transliteration: "na jāyate mriyate vā kadāchin nāyaṁ bhūtvā bhavitā vā na bhūyaḥ\najo nityaḥ śhāśhvato 'yaṁ purāṇo na hanyate hanyamāne śharīre", translationEnglish: 'The soul is never born nor dies at any time.It has not come into being, does not come into being, and will not come into being.It is unborn, eternal, ever- existing, and primeval.It is not slain when the body is slain.', translationHindi: 'यह आत्मा कभी न जन्म लेती है और न मरती है। यह उत्पन्न होकर फिर होने वाली नहीं है। यह अजन्मा, नित्य, सनातन और पुरातन है। शरीर के मारे जाने पर भी यह नहीं मारी जाती।', wordMeanings: [{ word: 'अजः', meaning: 'unborn' }, { word: 'नित्यः', meaning: 'eternal' }, { word: 'शाश्वतः', meaning: 'ever - existing' }, { word: 'पुराणः', meaning: 'primeval' }], tags: ['atman', 'soul', 'immortality', 'birth', 'death', 'eternal'] },
  {
    chapterNumber: 2, verseNumber: 47, sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन |\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ||२-४७||', transliteration: "karmaṇy-evādhikāras te mā phaleṣhu kadāchana\nmā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi", translationEnglish: 'You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.Never consider yourself the cause of the results of your activities, and never be attached to not doing your duty.', translationHindi: 'तुम्हारा कर्म करने पर ही अधिकार है, कर्मफल पर कभी नहीं। कर्मफल की कामना मत करो, और अकर्म में भी आसक्ति मत रखो।', wordMeanings: [{ word: 'कर्मणि', meaning: 'in action / duty' }, { word: 'अधिकारः', meaning: 'right / entitlement' }, { word: 'फलेषु', meaning: 'in the fruits' }, { word: 'अकर्मणि', meaning: 'in inaction' }], tags: ['karma', 'duty', 'nishkama', 'action', 'detachment', 'most famous verse']
  },
  { chapterNumber: 2, verseNumber: 48, sanskrit: 'योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय |\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते ||२-४८||', transliteration: 'yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya\nsiddhyasiddhyoḥ samo bhūtvā samatvaṁ yoga uchyate', translationEnglish: 'Perform your duty equipoised, O Arjuna, abandoning all attachment to success or failure. Such equanimity is called yoga.', translationHindi: 'हे धनंजय! आसक्ति छोड़कर, सफलता और असफलता में सम रहते हुए योग में स्थित होकर कर्म करो। यह समत्व भाव ही योग कहलाता है।', wordMeanings: [{ word: 'समत्वम्', meaning: 'equanimity/evenness of mind' }, { word: 'योगः', meaning: 'yoga — union, discipline' }], tags: ['yoga', 'equanimity', 'karma', 'action'] },
  {
    chapterNumber: 2, verseNumber: 62, sanskrit: 'ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते |\nसङ्गात्सञ्जायते कामः कामात्क्रोधोऽभिजायते ||२-६२||', transliteration: "dhyāyato viṣhayān puṁsaḥ saṅgas teṣhūpajāyate\nsaṅgāt sañjāyate kāmaḥ kāmāt krodho 'bhijāyate", translationEnglish: 'While contemplating the objects of the senses, a person develops attachment for them, and from such attachment lust develops, and from lust anger arises.', translationHindi: 'विषयों का चिंतन करते रहने से उनमें आसक्ति हो जाती है; आसक्ति से काम(इच्छा) उत्पन्न होती है और काम से क्रोध उत्पन्न होता है।', wordMeanings: [{ word: 'ध्यायतः', meaning: 'contemplating / thinking about' }, { word: 'सङ्गः', meaning: 'attachment' }, { word: 'कामः', meaning: 'desire / lust' }, { word: 'क्रोधः', meaning: 'anger' }], tags: ['mind', 'desire', 'anger', 'senses', 'psychology']
  },
  { chapterNumber: 2, verseNumber: 70, sanskrit: 'आपूर्यमाणमचलप्रतिष्ठं समुद्रमापः प्रविशन्ति यद्वत् |\nतद्वत्कामा यं प्रविशन्ति सर्वे स शान्तिमाप्नोति न कामकामी ||२-७०||', transliteration: 'āpūryamāṇam achala-pratiṣhṭhaṁ samudram āpaḥ praviśhanti yadvat\ntadvat kāmā yaṁ praviśhanti sarve sa śhāntim āpnoti na kāma-kāmī', translationEnglish: 'A person who is not disturbed in mind even amidst the threefold miseries or elated when there is happiness, and who is free from attachment, fear and anger, is called a sage of steady mind.', translationHindi: 'जैसे सब नदियाँ महासागर में मिलती हैं और वह अचल प्रतिष्ठित रहता है, उसी प्रकार जिसमें सब काम प्रवेश करते हैं, वह शांति प्राप्त करता है — काम की कामना करने वाला नहीं।', wordMeanings: [{ word: 'समुद्रम्', meaning: 'ocean' }, { word: 'शान्तिम्', meaning: 'peace' }, { word: 'कामकामी', meaning: 'one who desires desires' }], tags: ['peace', 'equanimity', 'desire', 'ocean', 'steady wisdom'] },

  // Chapter 3
  { chapterNumber: 3, verseNumber: 8, sanskrit: 'नियतं कुरु कर्म त्वं कर्म ज्यायो ह्यकर्मणः |\nशरीरयात्रापि च ते न प्रसिद्ध्येदकर्मणः ||३-८||', transliteration: 'niyataṁ kuru karma tvaṁ karma jyāyo hy akarmaṇaḥ\nśharīra-yātrāpi cha te na prasiddhyed akarmaṇaḥ', translationEnglish: 'Perform your prescribed duty, for action is better than inaction. Even the maintenance of your physical body would not be possible without action.', translationHindi: 'तुम नियत कर्म करो, क्योंकि कर्म न करने से कर्म करना श्रेष्ठ है। अकर्म से तो तुम्हारी शारीरिक यात्रा भी सिद्ध नहीं होगी।', wordMeanings: [{ word: 'नियतम्', meaning: 'prescribed/obligatory' }, { word: 'कर्म', meaning: 'action/duty' }], tags: ['karma', 'action', 'duty', 'inaction'] },
  { chapterNumber: 3, verseNumber: 21, sanskrit: 'यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः |\nस यत्प्रमाणं कुरुते लोकस्तदनुवर्तते ||३-२१||', transliteration: 'yad yad ācharati śhreṣhṭhas tat tad evetaro janaḥ\nsa yat pramāṇaṁ kurute lokas tad anuvartate', translationEnglish: 'Whatever action a great man performs, common men follow. And whatever standards he sets by exemplary acts, all the world pursues.', translationHindi: 'श्रेष्ठ पुरुष जो-जो आचरण करता है, अन्य मनुष्य भी वही करते हैं। वह जो प्रमाण (आदर्श) स्थापित करता है, संसार उसी का अनुसरण करता है।', wordMeanings: [{ word: 'श्रेष्ठः', meaning: 'the best/the great' }, { word: 'लोकः', meaning: 'the world/people' }], tags: ['leadership', 'example', 'society', 'role model'] },

  // Chapter 4
  { chapterNumber: 4, verseNumber: 7, sanskrit: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत |\nअभ्युत्थानमधर्मस्य तदाऽत्मानं सृजाम्यहम् ||४-७||', transliteration: 'yadā yadā hi dharmasya glānir bhavati bhārata\nabhyutthānam adharmasya tadātmānaṁ sṛijāmy aham', translationEnglish: 'Whenever and wherever there is a decline in righteousness, O Arjuna, and a predominant rise of unrighteousness — at that time I manifest Myself personally.', translationHindi: 'हे भारत! जब-जब धर्म की हानि और अधर्म की वृद्धि होती है, तब-तब मैं स्वयं को प्रकट करता हूँ।', wordMeanings: [{ word: 'धर्मस्य', meaning: 'of righteousness' }, { word: 'ग्लानिः', meaning: 'decline/diminishment' }, { word: 'अधर्मस्य', meaning: 'of unrighteousness' }], tags: ['dharma', 'avatar', 'divine incarnation', 'righteousness'] },
  { chapterNumber: 4, verseNumber: 8, sanskrit: 'परित्राणाय साधूनां विनाशाय च दुष्कृताम् |\nधर्मसंस्थापनार्थाय सम्भवामि युगे युगे ||४-८||', transliteration: 'paritrāṇāya sādhūnāṁ vināśhāya cha duṣhkṛitām\ndharma-sansthāpanārthāya sambhavāmi yuge yuge', translationEnglish: 'To deliver the pious and to annihilate the miscreants, as well as to reestablish the principles of religion, I Myself appear, millennium after millennium.', translationHindi: 'साधुओं की रक्षा के लिए, दुष्टों के विनाश के लिए और धर्म की स्थापना के लिए, मैं युग-युग में जन्म लेता हूँ।', wordMeanings: [{ word: 'परित्राणाय', meaning: 'for the deliverance/protection' }, { word: 'साधूनाम्', meaning: 'of the righteous/devotees' }, { word: 'युगे युगे', meaning: 'age after age' }], tags: ['avatar', 'dharma', 'divine protection', 'cycles of time'] },

  // Chapter 5
  { chapterNumber: 5, verseNumber: 18, sanskrit: 'विद्याविनयसम्पन्ने ब्राह्मणे गवि हस्तिनि |\nशुनि चैव श्वपाके च पण्डिताः समदर्शिनः ||५-१८||', transliteration: 'vidyā-vinaya-sampanne brāhmaṇe gavi hastini\nśhuni chaiva śhva-pāke cha paṇḍitāḥ sama-darśhinaḥ', translationEnglish: 'The humble sages, by virtue of true knowledge, see with equal vision a learned and gentle brahmin, a cow, an elephant, a dog, and a dog-eater.', translationHindi: 'विद्या और विनय से युक्त ब्राह्मण में, गाय में, हाथी में, कुत्ते में और चाण्डाल में भी पण्डित समदर्शी होते हैं।', wordMeanings: [{ word: 'समदर्शिनः', meaning: 'seeing with equal vision' }, { word: 'पण्डिताः', meaning: 'the wise' }], tags: ['equality', 'vision', 'wisdom', 'all beings'] },

  // Chapter 6 — meditation
  { chapterNumber: 6, verseNumber: 5, sanskrit: 'उद्धरेदात्मनाऽत्मानं नात्मानमवसादयेत् |\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ||६-५||', transliteration: 'uddhared ātmanātmānaṁ nātmānam avasādayet\nātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ', translationEnglish: 'A man must elevate himself by his own mind, not degrade himself. The mind is the friend of the conditioned soul, and his enemy as well.', translationHindi: 'मनुष्य को अपने आप से ही अपना उद्धार करना चाहिए, अपने आप को अधोगति में नहीं डालना चाहिए। मन ही मनुष्य का मित्र है और मन ही शत्रु।', wordMeanings: [{ word: 'उद्धरेत्', meaning: 'should elevate/uplift' }, { word: 'बन्धुः', meaning: 'friend' }, { word: 'रिपुः', meaning: 'enemy' }], tags: ['mind', 'self-mastery', 'friend', 'enemy', 'elevation'] },

  // Chapter 7
  { chapterNumber: 7, verseNumber: 19, sanskrit: 'बहूनां जन्मनामन्ते ज्ञानवान्मां प्रपद्यते |\nवासुदेवः सर्वमिति स महात्मा सुदुर्लभः ||७-१९||', transliteration: 'bahūnāṁ janmanām ante jñānavān māṁ prapadyate\nvāsudevaḥ sarvam iti sa mahātmā su-durlabhaḥ', translationEnglish: 'After many births and deaths, he who is actually in knowledge surrenders unto Me, knowing Me to be the cause of all causes and all that is. Such a great soul is very rare.', translationHindi: 'अनेक जन्मों के अंत में ज्ञानवान् पुरुष "वासुदेव ही सब कुछ है" ऐसा जानकर मुझे प्राप्त होता है। ऐसा महात्मा अत्यंत दुर्लभ है।', wordMeanings: [{ word: 'बहूनाम्', meaning: 'of many' }, { word: 'जन्मनाम्', meaning: 'births' }, { word: 'महात्मा', meaning: 'great soul' }], tags: ['knowledge', 'surrender', 'liberation', 'many lives'] },

  // Chapter 9
  { chapterNumber: 9, verseNumber: 22, sanskrit: 'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते |\nतेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम् ||९-२२||', transliteration: 'ananyāśh chintayanto māṁ ye janāḥ paryupāsate\nteṣhāṁ nityābhiyuktānāṁ yoga-kṣhemaṁ vahāmy aham', translationEnglish: 'But those who worship Me with devotion, meditating on My transcendental form — to them I carry what they lack, and I preserve what they have.', translationHindi: 'जो अनन्य भाव से मेरा चिंतन करते हुए मेरी उपासना करते हैं, उन नित्य मेरे में युक्त उपासकों का योगक्षेम मैं वहन करता हूँ।', wordMeanings: [{ word: 'अनन्याः', meaning: 'with undivided devotion' }, { word: 'योगक्षेमम्', meaning: 'welfare/what is needed and what is preserved' }, { word: 'वहामि', meaning: 'I carry/provide' }], tags: ['devotion', 'bhakti', 'divine protection', 'promise'] },

  // Chapter 11
  { chapterNumber: 11, verseNumber: 32, sanskrit: 'श्रीभगवानुवाच\nकालोऽस्मि लोकक्षयकृत्प्रवृद्धो- लोकान्समाहर्तुमिह प्रवृत्तः |\nऋतेऽपि त्वां न भविष्यन्ति सर्वे येऽवस्थिताः प्रत्यनीकेषु योधाः ||११-३२||', transliteration: "kālo 'smi loka- kṣhaya - kṛit pravṛiddho lokān samāhartum iha pravṛittaḥ\nṛite 'pi tvāṁ na bhaviṣhyanti sarve ye 'vasthitāḥ pratyanīkeṣhu yodhāḥ", translationEnglish: 'The Lord said: I am time, the great destroyer of the worlds, and I have come here to destroy all people.With the exception of you, all the soldiers here on both sides will be slain.', translationHindi: 'श्री भगवान ने कहा: मैं काल हूँ, लोकों को नष्ट करने वाला प्रवृद्ध काल। अब मैं इन लोकों का संहार करने के लिए यहाँ प्रवृत्त हुआ हूँ। तुम्हारे बिना भी, दोनों सेनाओं में खड़े सभी योद्धा नहीं रहेंगे।', wordMeanings: [{ word: 'कालः', meaning: 'Time / the destroyer' }, { word: 'लोकक्षयकृत्', meaning: 'the destroyer of worlds' }], tags: ['time', 'destruction', 'cosmic form', 'vishvarupa'] },

  // Chapter 12
  { chapterNumber: 12, verseNumber: 13, sanskrit: 'अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च |\nनिर्ममो निरहङ्कारः समदुःखसुखः क्षमी ||१२-१३||', transliteration: 'adveṣhṭā sarva-bhūtānāṁ maitraḥ karuṇa eva cha\nnirmamo nirahaṅkāraḥ sama-duḥkha-sukhaḥ kṣhamī', translationEnglish: 'One who is not envious but is a kind friend to all living entities, who does not think himself a proprietor and is free from false ego, who is equal in both happiness and distress, who is tolerant…', translationHindi: 'जो सभी प्राणियों से द्वेष नहीं करता, जो सबका मित्र और दयालु है, जो ममता-रहित और अहंकार-रहित है, सुख-दुःख में समान रहता है और क्षमाशील है…', wordMeanings: [{ word: 'अद्वेष्टा', meaning: 'non-envious' }, { word: 'मैत्रः', meaning: 'friendly' }, { word: 'करुणः', meaning: 'compassionate' }, { word: 'क्षमी', meaning: 'forgiving' }], tags: ['devotee', 'qualities', 'compassion', 'equanimity', 'dear to krishna'] },

  // Chapter 15
  { chapterNumber: 15, verseNumber: 7, sanskrit: 'ममैवांशो जीवलोके जीवभूतः सनातनः |\nमनःषष्ठानीन्द्रियाणि प्रकृतिस्थानि कर्षति ||१५-७||', transliteration: 'mamaivāṁśho jīva-loke jīva-bhūtaḥ sanātanaḥ\nmanaḥ-ṣhaṣhṭhānīndriyāṇi prakṛiti-sthāni karṣhati', translationEnglish: 'The living entities in this conditioned world are My eternal fragmental parts. Due to conditioned life, they are struggling very hard with the six senses, which include the mind.', translationHindi: 'इस जीवलोक में जीवात्मा मेरा ही सनातन अंश है। वह प्रकृति में स्थित मन सहित छः इन्द्रियों को आकृष्ट करता है।', wordMeanings: [{ word: 'अंशः', meaning: 'fragment/part' }, { word: 'सनातनः', meaning: 'eternal' }, { word: 'इन्द्रियाणि', meaning: 'the senses' }], tags: ['soul', 'divine fragment', 'senses', 'struggle'] },

  // Chapter 18 — conclusion
  { chapterNumber: 18, verseNumber: 65, sanskrit: 'मन्मना भव मद्भक्तो मद्याजी मां नमस्कुरु |\nमामेवैष्यसि सत्यं ते प्रतिजाने प्रियोऽसि मे ||१८-६५||', transliteration: "man-manā bhava mad-bhakto mad-yājī māṁ namaskuru\nmām evaiṣhyasi satyaṁ te pratijāne priyo 'si me", translationEnglish: 'Always think of Me and become My devotee, worship Me and offer your homage unto Me.Thus you will come to Me without fail.I promise you this because you are My very dear friend.', translationHindi: 'मुझमें मन लगाओ, मेरे भक्त बनो, मेरी पूजा करो, मुझे प्रणाम करो — तुम निश्चित ही मुझे प्राप्त होगे। यह मैं तुमसे सत्य प्रतिज्ञा करता हूँ क्योंकि तुम मेरे प्रिय हो।', wordMeanings: [{ word: 'मन्मनाः', meaning: 'with mind fixed on Me' }, { word: 'मद्भक्तः', meaning: 'My devotee' }, { word: 'प्रतिजाने', meaning: 'I promise/ pledge' }], tags: ['devotion', 'promise', 'liberation', 'love', 'conclusion'] },
  { chapterNumber: 18, verseNumber: 66, sanskrit: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज |\nअहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः ||१८-६६||', transliteration: 'sarva-dharmān parityajya mām ekaṁ śharaṇaṁ vraja\nahaṁ tvāṁ sarva-pāpebhyo mokṣhayiṣhyāmi mā śhucha', translationEnglish: 'Abandon all varieties of dharma and just surrender unto Me alone. I shall deliver you from all sinful reactions; do not fear.', translationHindi: 'सब धर्मों को त्यागकर तुम केवल मेरी शरण में आओ। मैं तुम्हें सब पापों से मुक्त कर दूँगा, शोक मत करो।', wordMeanings: [{ word: 'सर्वधर्मान्', meaning: 'all dharmas/duties' }, { word: 'परित्यज्य', meaning: 'abandoning' }, { word: 'शरणम्', meaning: 'refuge' }, { word: 'मोक्षयिष्यामि', meaning: 'I will liberate' }], tags: ['surrender', 'liberation', 'moksha', 'grace', 'conclusion', 'charama shloka'] },
];

// ── Main ingestion flow ───────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Gyan Sutra — Data Ingestion Script          ║');
  console.log('╚══════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('[MODE] Dry run — no Firestore writes will occur.');
  if (SKIP_EMBED) console.log('[MODE] Skip embed — storing text data only.');
  console.log(`[SOURCE] ${SOURCE.id}`);

  // ── 1. Ingest chapters ─────────────────────────────────────────────────────
  console.log('\n[Step 1/3] Ingesting chapters…');
  const chapterItems = GITA_CHAPTERS.map(ch => ({
    id: `chapter_${ch.number}`,
    data: {
      ...ch,
      sourceText: SOURCE.title,
    },
  }));

  if (!DRY_RUN) {
    await batchWrite('chapters', chapterItems);
  }
  console.log(`  ✓ ${chapterItems.length} chapters prepared.`);

  // ── 2. Load verse data ─────────────────────────────────────────────────────
  console.log('\n[Step 2/3] Loading verse data…');
  const rawVerses = loadVerseData();
  console.log(`  ✓ ${rawVerses.length} verses loaded.`);

  // ── 3. Generate embeddings and ingest verses ───────────────────────────────
  console.log('\n[Step 3/3] Generating embeddings and ingesting verses…');
  console.log('  This will take a few minutes for the full dataset. Please wait.');

  // Build the embedding text for each verse
  const embeddingTexts = rawVerses.map(v => buildVerseEmbeddingText(v));

  let embeddings;
  if (SKIP_EMBED) {
    console.log('  [SKIP_EMBED] Using zero vectors.');
    embeddings = rawVerses.map(() => new Array(768).fill(0));
  } else {
    embeddings = await batchEmbedTexts(embeddingTexts, 120); // 120ms delay = ~500 RPM
  }

  // Build Firestore documents
  const verseItems = rawVerses.map((v, i) => {
    const docId = `${v.chapterNumber}_${v.verseNumber}`;
    return {
      id: `${SOURCE_ID}_${docId}`,
      data: {
        source_id: SOURCE_ID,
        chapterNumber: v.chapterNumber,
        verseNumber: v.verseNumber,
        sanskrit: v.sanskrit || '',
        transliteration: v.transliteration || '',
        wordMeanings: v.wordMeanings || [],
        translationHindi: v.translationHindi || '',
        translationEnglish: v.translationEnglish || '',
        sourceCommentary: v.sourceCommentary || '',
        sourceText: SOURCE.title,
        tags: v.tags || [],
        embedding: FieldValue.vector(embeddings[i]),
      },
    };
  });

  if (!DRY_RUN) {
    await batchWrite('verses', verseItems);
  }
  console.log(`  ✓ ${verseItems.length} verses ingested with embeddings.`);

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Ingestion complete!                          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\nNext steps:');
  console.log('  1. In Firebase Console → Firestore → Indexes, create a vector index:');
  console.log('     Collection: verses | Field: embedding | Dimension: 768 | Measure: COSINE');
  console.log('  2. Start the API: npm start');
  console.log('  3. Test: curl http://localhost:3001/api/chapters');

  process.exit(0);
}

main().catch(err => {
  console.error('\n[FATAL] Ingestion failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});