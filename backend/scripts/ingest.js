/**
 * Gyan Sutra — High-Fidelity API-Driven Ingestor
 * ────────────────────────────────────────────────────────────────────────────
 * Fetches verse records via the stable open static API layer, maps bilingual 
 * translation nodes, processes local ONNX 384-dim embeddings, and updates Firestore.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { batchWrite } = require('../src/services/firestore');
const { embedText } = require('../src/services/embedding');
const { SOURCES } = require('../src/data/sources');
const { FieldValue } = require('firebase-admin/firestore');
const gitaData = require('../data/gita.json');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EMBED = process.argv.includes('--skip-embed');
const SOURCE_ID = 'bhagavad-gita';
const SOURCE = SOURCES.find((item) => item.id === SOURCE_ID) || { id: SOURCE_ID, title: 'Bhagavad Gita' };

const GITA_CHAPTERS = [
  { number: 1, titleSanskrit: 'अर्जुनविषादयोग', titleHindi: 'अर्जुन विषाद योग', titleEnglish: "Arjuna's Dilemma", verseCount: 47 },
  { number: 2, titleSanskrit: 'सांख्ययोग', titleHindi: 'सांख्य योग', titleEnglish: 'The Yoga of Knowledge', verseCount: 72 },
  { number: 3, titleSanskrit: 'कर्मयोग', titleHindi: 'कर्म योग', titleEnglish: 'The Yoga of Action', verseCount: 43 },
  { number: 4, titleSanskrit: 'ज्ञानकर्मसंन्यासयोग', titleHindi: 'ज्ञान कर्म संन्यास योग', titleEnglish: 'The Yoga of Knowledge and Action', verseCount: 42 },
  { number: 5, titleSanskrit: 'कर्मसंन्यासयोग', titleHindi: 'कर्म संन्यास योग', titleEnglish: 'The Yoga of Renunciation', verseCount: 29 },
  { number: 6, titleSanskrit: 'आत्मसंयमयोग', titleHindi: 'आत्म संयम योग', titleEnglish: 'The Yoga of Meditation', verseCount: 47 },
  { number: 7, titleSanskrit: 'ज्ञानविज्ञानयोग', titleHindi: 'ज्ञान विज्ञान योग', titleEnglish: 'The Yoga of Knowledge and Wisdom', verseCount: 30 },
  { number: 8, titleSanskrit: 'अक्षरब्रह्मयोग', titleHindi: 'अक्षर ब्रह्म योग', titleEnglish: 'The Yoga of the Imperishable Brahman', verseCount: 28 },
  { number: 9, titleSanskrit: 'राजविद्याराजगुह्ययोग', titleHindi: 'राज विद्या राज गुह्य योग', titleEnglish: 'The Yoga of Royal Knowledge', verseCount: 34 },
  { number: 10, titleSanskrit: 'विभूतियोग', titleHindi: 'विभूति योग', titleEnglish: 'The Yoga of Divine Manifestations', verseCount: 42 },
  { number: 11, titleSanskrit: 'विश्वरूपदर्शनयोग', titleHindi: 'विश्वरूप दर्शन योग', titleEnglish: 'The Vision of the Cosmic Form', verseCount: 55 },
  { number: 12, titleSanskrit: 'भक्तियोग', titleHindi: 'भक्ति योग', titleEnglish: 'The Yoga of Devotion', verseCount: 20 },
  { number: 13, titleSanskrit: 'क्षेत्रक्षेत्रज्ञविभागयोग', titleHindi: 'क्षेत्र क्षेत्रज्ञ विभाग योग', titleEnglish: 'The Yoga of the Field and Its Knower', verseCount: 35 },
  { number: 14, titleSanskrit: 'गुणत्रयविभागयोग', titleHindi: 'गुण त्रय विभाग योग', titleEnglish: 'The Yoga of the Three Qualities', verseCount: 27 },
  { number: 15, titleSanskrit: 'पुरुषोत्तमयोग', titleHindi: 'पुरुषोत्तम योग', titleEnglish: 'The Yoga of the Supreme Person', verseCount: 20 },
  { number: 16, titleSanskrit: 'दैवासुरसम्पद्विभागयोग', titleHindi: 'दैव असुर सम्पद विभाग योग', titleEnglish: 'The Yoga of Divine and Demonic Qualities', verseCount: 24 },
  { number: 17, titleSanskrit: 'श्रद्धात्रयविभागयोग', titleHindi: 'श्रद्धा त्रय विभाग योग', titleEnglish: 'The Yoga of the Threefold Faith', verseCount: 28 },
  { number: 18, titleSanskrit: 'मोक्षसंन्यासयोग', titleHindi: 'मोक्ष संन्यास योग', titleEnglish: 'The Yoga of Liberation through Renunciation', verseCount: 78 }
];

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Gyan Sutra — API Ingestion Engine Live     ║');
  console.log('╚══════════════════════════════════════════════╝');

  console.log('\n[Step 1/2] Synchronizing chapter blueprints…');
  const chapterItems = GITA_CHAPTERS.map(ch => ({
    id: `chapter_${ch.number}`,
    data: { ...ch, sourceText: SOURCE.title }
  }));
  if (!DRY_RUN) await batchWrite('chapters', chapterItems);
  console.log(`  ✓ ${chapterItems.length} chapters loaded.`);

  console.log('\n[Step 2/2] Resolving and parsing verses sequentially from API…');

  for (const ch of GITA_CHAPTERS) {
    console.log(`\n  Processing Chapter ${ch.number} (${ch.titleEnglish})...`);
    const verseItems = [];

    for (let vNum = 1; vNum <= ch.verseCount; vNum++) {
      try {
        // Find the enriched verse locally from our dataset
        const localVerse = gitaData.find(v => v.chapter_number === ch.number && v.verse_number === vNum);
        if (!localVerse) {
          throw new Error(`Verse ${ch.number}.${vNum} not found in local gita.json`);
        }

        const sanskritText = localVerse.sanskrit || '';
        const trans = localVerse.transliteration || '';
        const transEng = localVerse.english || '';
        const transHindi = localVerse.hindi || '';
        
        // Use existing word meanings (we don't need to re-parse unless it's the raw format)
        // Since the previous script parsed rawWordMeanings from API, and our local gita.json
        // has word_meanings as a string, let's parse it if needed, or just store it as string
        const wordMeaningsStr = localVerse.word_meanings || '';
        const parsedWordMeanings = wordMeaningsStr
          ? wordMeaningsStr.split('?').map(item => {
            const parts = item.split(' ');
            return { word: parts[0]?.trim() || '', meaning: parts.slice(1).join(' ')?.trim() || '' };
          }).filter(item => item.word && !item.word.includes('Commentary'))
          : [];

        const embeddingText = `Chapter ${ch.number}, Verse ${vNum}\n${sanskritText}\n${transEng}\n${transHindi}`;

        let vector;
        if (SKIP_EMBED) {
          vector = new Array(384).fill(0);
        } else {
          vector = await embedText(embeddingText);
        }

        verseItems.push({
          id: `${SOURCE_ID}_${ch.number}_${vNum}`,
          data: {
            source_id: SOURCE_ID,
            chapterNumber: ch.number,
            verseNumber: vNum,
            sanskrit: sanskritText,
            transliteration: trans,
            wordMeanings: parsedWordMeanings,
            translationHindi: transHindi,
            translationEnglish: transEng,
            detailedExplanations: localVerse.detailed_explanations || [], // <--- Injecting the new rich explanations here!
            sourceText: SOURCE.title,
            tags: [],
            embedding: FieldValue.vector(vector),
          },
        });
      } catch (err) {
        console.error(`    ❌ Error on Verse ${ch.number}.${vNum}:`, err.message);
      }
    }

    if (!DRY_RUN && verseItems.length > 0) {
      await batchWrite('verses', verseItems);
      console.log(`    ✓ Chapter ${ch.number} batch synced (${verseItems.length} verses).`);
    }

    // Tiny delay to breathe between chapter batches
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\n  ✓ Complete database ingestion finished successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error('\n[FATAL] Pipeline crash:', err.message);
  process.exit(1);
});