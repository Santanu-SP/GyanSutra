const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { db, setDoc, batchWrite } = require('../src/services/firestore');
const { embedText } = require('../src/services/embedding');

// Map Kanda names to numbers
const kandaToNumber = {
  'Bala Kanda': 1,
  'Ayodhya Kanda': 2,
  'Aranya Kanda': 3,
  'Kishkindha Kanda': 4,
  'Sundara Kanda': 5,
  'Yuddha Kanda': 6,
  'Uttara Kanda': 7
};

function normalizeSanskrit(text) {
  if (!text) return '';
  return text
    .replace(/[\s\u200b\u200c\u200d।॥\d\.\,\?\!\-\_\;\(\)\{\}\[\]\n\r]/g, '')
    .trim();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Starting Ramayana ingestion with Itihasa integration...');

  const valmikiPath = path.join(__dirname, '../data/raw/Valmiki_Ramayan_Dataset/data/Valmiki_Ramayan_Shlokas.json');
  const itihasaPath = path.join(__dirname, '../data/raw/itihasa/res/ramayana.json');

  if (!fs.existsSync(valmikiPath)) {
    console.error('Valmiki_Ramayan_Shlokas.json not found!');
    process.exit(1);
  }

  // Load and Index Itihasa by Sanskrit text
  let itihasaMap = new Map();
  if (fs.existsSync(itihasaPath)) {
    console.log('Loading Itihasa dataset for English translation backfilling...');
    const itihasaData = JSON.parse(fs.readFileSync(itihasaPath, 'utf8'));
    
    let count = 0;
    for (const vol in itihasaData) {
      const chapters = itihasaData[vol];
      for (const ch of chapters) {
        if (ch.sn && ch.en) {
          for (let i = 0; i < ch.sn.length; i++) {
            const snText = ch.sn[i];
            const enText = ch.en[i];
            if (snText && enText) {
              const norm = normalizeSanskrit(snText);
              if (norm) {
                // If collision, we keep the translation or append it
                itihasaMap.set(norm, enText);
                count++;
              }
            }
          }
        }
      }
    }
    console.log(`Indexed ${count} shlokas from Itihasa dataset.`);
  } else {
    console.warn('Itihasa ramayana.json not found! Proceeding without it.');
  }

  const rawData = JSON.parse(fs.readFileSync(valmikiPath, 'utf8'));
  console.log(`Loaded ${rawData.length} shlokas from Valmiki_Ramayan_Dataset`);

  let successCount = 0;
  let itihasaMatchCount = 0;
  let missingEnglishExpCount = 0;

  // To avoid hitting API rate limits with embeddings, process in smaller batches
  const BATCH_SIZE = 50;
  let batchData = [];

  // Process ALL shlokas in the dataset
  const dataToProcess = rawData;
  console.log(`Processing all ${dataToProcess.length} shlokas across every sarga and kanda...`);

  for (let i = 0; i < dataToProcess.length; i++) {
    const item = dataToProcess[i];

    const kNum = kandaToNumber[item.kanda] || 0;
    const docId = `valmiki-ramayana_${kNum}_${item.sarga}_${item.shloka}`;

    const normSanskrit = normalizeSanskrit(item.shloka_text);
    const itihasaTranslation = itihasaMap.get(normSanskrit) || null;

    if (itihasaTranslation) {
      itihasaMatchCount++;
    }

    const hasEnglishExp = !!item.explanation;
    if (!hasEnglishExp) missingEnglishExpCount++;

    // Format into the normalized schema
    const verseData = {
      id: docId,
      book: 'ramayana',
      kanda: item.kanda,
      kandaNumber: kNum,
      sarga: item.sarga,
      shlokaNumber: item.shloka,
      sanskrit: item.shloka_text || '',
      transliteration: item.transliteration || '',
      translationHindi: null, // Genuninely missing from dataset
      translationEnglish: itihasaTranslation || item.translation || null, // Prioritize M.N. Dutt English translation from Itihasa, fallback to word-by-word
      explanationHindi: null, // Genuinely missing
      explanationEnglish: item.explanation || null, // Prose explanation
      comments: item.comments || null,
      key_terms: [], // Would require NLP extraction
      source: itihasaTranslation ? 'AshuVj/Valmiki_Ramayan_Dataset + rahular/itihasa' : 'AshuVj/Valmiki_Ramayan_Dataset',
      verified: hasEnglishExp ? true : false,
    };

    // Prepare string for embedding
    const embedStr = [
      verseData.sanskrit,
      verseData.translationEnglish,
      verseData.explanationEnglish,
      verseData.comments
    ].filter(Boolean).join(' | ');

    try {
      const embedding = await embedText(embedStr);
      verseData.embedding = embedding;

      batchData.push({ id: docId, data: verseData });
      successCount++;

      console.log(`Processed: ${docId}`);

      if (batchData.length >= BATCH_SIZE) {
        await batchWrite('verses', batchData);
        batchData = [];
        await sleep(1000); // Gentle backoff for rate limits
      }
    } catch (err) {
      console.error(`Failed to process ${docId}:`, err.message);
    }
  }

  // Flush remaining
  if (batchData.length > 0) {
    await batchWrite('verses', batchData);
  }

  console.log('--- INGESTION COMPLETE ---');
  console.log(`Successfully ingested: ${successCount} verses`);
  console.log(`Matched with Itihasa: ${itihasaMatchCount}`);
  console.log(`Missing English Explanations (Flagged): ${missingEnglishExpCount}`);
  console.log(`Missing Hindi Translations: All (Left null for manual review)`);
}

run().catch(console.error);
