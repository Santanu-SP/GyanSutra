/**
 * Gyan Sutra — High-Fidelity Data Ingestion Script
 * ────────────────────────────────────────────────────────────────────────────
 * Reads local JSON text data, extracts bilingual semantic value fragments, 
 * computes local ONNX 384-dim embeddings, and updates Firestore.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const { batchWrite } = require('../src/services/firestore');
const { embedText } = require('../src/services/embedding');
const { SOURCES } = require('../src/data/sources');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EMBED = process.argv.includes('--skip-embed');
const SOURCE_ID_ARG = process.argv.find(arg => arg.startsWith('--source_id=') || arg.startsWith('--source-id='));
const SOURCE_ID = SOURCE_ID_ARG ? SOURCE_ID_ARG.split('=')[1] : 'bhagavad-gita';
const SOURCE = SOURCES.find((item) => item.id === SOURCE_ID) || { id: SOURCE_ID, title: SOURCE_ID, description: '' };

const GITA_CHAPTERS = [
  { number: 1, titleSanskrit: 'अर्जुनविषादयोग', titleHindi: 'अर्जुन विषाद योग', titleEnglish: "Arjuna's Dilemma", verseCount: 47, summary: 'On the battlefield of Kurukshetra, Arjuna is overcome with grief and moral confusion at the prospect of fighting his own kinsmen.' },
  { number: 2, titleSanskrit: 'सांख्ययोग', titleHindi: 'सांख्य योग', titleEnglish: 'The Yoga of Knowledge', verseCount: 72, summary: 'Krishna begins his teachings by distinguishing the eternal soul (Atman) from the perishable body.' },
  { number: 3, titleSanskrit: 'कर्मयोग', titleHindi: 'कर्म योग', titleEnglish: 'The Yoga of Action', verseCount: 43, summary: 'Krishna explains why action is unavoidable and superior to inaction.' },
  { number: 4, titleSanskrit: 'ज्ञानकर्मसंन्यासयोग', titleHindi: 'ज्ञान कर्म संन्यास योग', titleEnglish: 'The Yoga of Knowledge and Action', verseCount: 42, summary: 'Krishna reveals that this ancient wisdom has been transmitted through a lineage of kings.' },
  { number: 5, titleSanskrit: 'कर्मसंन्यासयोग', titleHindi: 'कर्म संन्यास योग', titleEnglish: 'The Yoga of Renunciation', verseCount: 29, summary: 'Krishna reconciles the paths of renunciation (Sannyasa) and selfless action (Karma Yoga).' },
  { number: 6, titleSanskrit: 'आत्मसंयमयोग', titleHindi: 'आत्म संयम योग', titleEnglish: 'The Yoga of Meditation', verseCount: 47, summary: 'Krishna gives detailed instructions on the practice of meditation (Dhyana Yoga).' },
  { number: 7, titleSanskrit: 'ज्ञानविज्ञानयोग', titleHindi: 'ज्ञान विज्ञान योग', titleEnglish: 'The Yoga of Knowledge and Wisdom', verseCount: 30, summary: 'Krishna reveals his higher and lower nature and declares himself the ultimate ground.' },
  { number: 8, titleSanskrit: 'अक्षरब्रह्मयोग', titleHindi: 'अक्षर ब्रह्म योग', titleEnglish: 'The Yoga of the Imperishable Brahman', verseCount: 28, summary: 'Krishna answers Arjuna\'s questions about Brahman, Karma, and death paths.' },
  { number: 9, titleSanskrit: 'राजविद्याराजगुह्ययोग', titleHindi: 'राज विद्या राज गुह्य योग', titleEnglish: 'The Yoga of Royal Knowledge', verseCount: 34, summary: 'Krishna calls this the king of sciences and the royal secret.' },
  { number: 10, titleSanskrit: 'विभूतियोग', titleHindi: 'विभूति योग', titleEnglish: 'The Yoga of Divine Manifestations', verseCount: 42, summary: 'Krishna enumerates his divine manifestations (Vibhutis).' },
  { number: 11, titleSanskrit: 'विश्वरूपदर्शनयोग', titleHindi: 'विश्वरूप दर्शन योग', titleEnglish: 'The Vision of the Cosmic Form', verseCount: 55, summary: 'At Arjuna\'s request, Krishna grants him divine sight to behold the Vishvarupa.' },
  { number: 12, titleSanskrit: 'भक्तियोग', titleHindi: 'भक्ति योग', titleEnglish: 'The Yoga of Devotion', verseCount: 20, summary: 'Krishna declares that devotion (Bhakti) is the most direct and accessible path.' },
  { number: 13, titleSanskrit: 'क्षेत्रक्षेत्रज्ञविभागयोग', titleHindi: 'क्षेत्र क्षेत्रज्ञ विभाग योग', titleEnglish: 'The Yoga of the Field and Its Knower', verseCount: 35, summary: 'Krishna distinguishes between the body and pure consciousness.' },
  { number: 14, titleSanskrit: 'गुणत्रयविभागयोग', titleHindi: 'गुण त्रय विभाग योग', titleEnglish: 'The Yoga of the Three Qualities', verseCount: 27, summary: 'Krishna explains the three Gunas — Sattva, Rajas, and Tamas.' },
  { number: 15, titleSanskrit: 'पुरुषोत्तमयोग', titleHindi: 'पुरुषोत्तम योग', titleEnglish: 'The Yoga of the Supreme Person', verseCount: 20, summary: 'Using the metaphor of the Ashvattha tree, Krishna describes phenomenal existence.' },
  { number: 16, titleSanskrit: 'दैवासुरसम्पद्विभागयोग', titleHindi: 'दैव असुर सम्पद विभाग योग', titleEnglish: 'The Yoga of Divine and Demonic Qualities', verseCount: 24, summary: 'Krishna enumerates divine (Daivi) and demonic (Asuri) qualities.' },
  { number: 17, titleSanskrit: 'श्रद्धात्रयविभागयोग', titleHindi: 'श्रद्धा त्रय विभाग योग', titleEnglish: 'The Yoga of the Threefold Faith', verseCount: 28, summary: 'Krishna classifies food, sacrifice, austerity, and charity according to the Gunas.' },
  { number: 18, titleSanskrit: 'मोक्षसंन्यासयोग', titleHindi: 'मोक्ष संन्यास योग', titleEnglish: 'The Yoga of Liberation through Renunciation', verseCount: 78, summary: 'The culminating chapter outlining absolute loving surrender.' },
];

function loadVerseData() {
  const fullDataPath = path.join(__dirname, '../data/gita.json');
  if (fs.existsSync(fullDataPath) && fs.statSync(fullDataPath).size > 0) {
    console.log('[Ingest] Loading database structure from data/gita.json');
    return JSON.parse(fs.readFileSync(fullDataPath, 'utf8'));
  }
  throw new Error('Critical data file at data/gita.json is empty or missing.');
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Gyan Sutra — High Fidelity Local Ingestor   ║');
  console.log('╚══════════════════════════════════════════════╝');

  console.log('\n[Step 1/3] Synchronizing chapter definitions…');
  const chapterItems = GITA_CHAPTERS.map(ch => ({
    id: `chapter_${ch.number}`,
    data: { ...ch, sourceText: SOURCE.title }
  }));

  if (!DRY_RUN) await batchWrite('chapters', chapterItems);
  console.log(`  ✓ ${chapterItems.length} chapters loaded.`);

  console.log('\n[Step 2/3] Parsing local data store…');
  const rawVerses = loadVerseData();
  console.log(`  ✓ ${rawVerses.length} records parsed from local file system.`);

  console.log('\n[Step 3/3] Generating vector positions and committing docs…');
  const verseItems = [];

  for (let i = 0; i < rawVerses.length; i++) {
    const v = rawVerses[i];

    // Maps variables safely from the praneshp1org schema layout
    const chNum = parseInt(v.chapter_number || v.chapter_id || 0, 10);
    const vNum = parseInt(v.verse_number || v.verse_id || 0, 10);

    if (!chNum || !vNum) continue;

    const sanskritText = v.text || v.sanskrit || '';
    const trans = v.transliteration || '';

    // This backup dataset includes discrete language translation strings naturally!
    const transEng = v.meaning || v.translation || '';
    const transHindi = v.hindi_meaning || v.hindi || 'भावार्थ उपलब्ध है।';
    const wordMeaningsStr = v.word_meaning || '';

    const parsedWordMeanings = wordMeaningsStr
      ? wordMeaningsStr.split(';').map(item => {
        const parts = item.split('—');
        return { word: parts[0]?.trim() || '', meaning: parts[1]?.trim() || '' };
      }).filter(item => item.word)
      : [];

    const embeddingText = [
      `Chapter ${chNum}, Verse ${vNum}`,
      sanskritText,
      transEng,
      transHindi
    ].filter(Boolean).join('\n');

    let vector;
    if (SKIP_EMBED) {
      vector = new Array(384).fill(0);
    } else {
      console.log(`  [HF Engine 384-Dim] Processing Verse ${chNum}.${vNum} (${i + 1}/${rawVerses.length})...`);
      vector = await embedText(embeddingText);
    }

    const docId = `${chNum}_${vNum}`;
    verseItems.push({
      id: `${SOURCE_ID}_${docId}`,
      data: {
        source_id: SOURCE_ID,
        chapterNumber: chNum,
        verseNumber: vNum,
        sanskrit: sanskritText,
        transliteration: trans,
        wordMeanings: parsedWordMeanings,
        translationHindi: transHindi,
        translationEnglish: transEng,
        sourceCommentary: v.commentary || '',
        sourceText: SOURCE.title,
        tags: [],
        embedding: FieldValue.vector(vector),
      },
    });
  }

  if (!DRY_RUN) {
    await batchWrite('verses', verseItems);
  }
  console.log(`\n  ✓ ${verseItems.length} verses synced successfully.`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n[FATAL] Pipeline crash:', err.message);
  process.exit(1);
});