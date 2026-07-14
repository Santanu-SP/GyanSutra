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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Starting Ramayana ingestion...');

  const valmikiPath = path.join(__dirname, '../data/raw/Valmiki_Ramayan_Dataset/data/Valmiki_Ramayan_Shlokas.json');
  if (!fs.existsSync(valmikiPath)) {
    console.error('Valmiki_Ramayan_Shlokas.json not found!');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(valmikiPath, 'utf8'));
  console.log(`Loaded ${rawData.length} shlokas from Valmiki_Ramayan_Dataset`);

  let successCount = 0;
  let missingEnglishExpCount = 0;
  
  // To avoid hitting API rate limits with embeddings, process in smaller batches
  const BATCH_SIZE = 50; 
  let batchData = [];
  
  // NOTE: For safety in this test run, we will just process the first 50 shlokas (Bala Kanda Sarga 1)
  // To process all 24000+, remove the slice(0, 50).
  const dataToProcess = rawData.slice(0, 50); 
  console.log(`Processing first ${dataToProcess.length} shlokas...`);

  for (let i = 0; i < dataToProcess.length; i++) {
    const item = dataToProcess[i];
    
    const kNum = kandaToNumber[item.kanda] || 0;
    const docId = `valmiki-ramayana_${kNum}_${item.sarga}_${item.shloka}`;

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
      translationEnglish: item.translation || null, // Word by word meaning
      explanationHindi: null, // Genuinely missing
      explanationEnglish: item.explanation || null, // Prose explanation
      comments: item.comments || null,
      key_terms: [], // Would require NLP extraction
      source: 'AshuVj/Valmiki_Ramayan_Dataset',
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
  console.log(`Missing English Explanations (Flagged): ${missingEnglishExpCount}`);
  console.log(`Missing Hindi Translations: All (Left null for manual review)`);
}

run().catch(console.error);
