const fs = require('fs');
const path = require('path');
const https = require('https');

const GITA_DATA_PATH = path.join(__dirname, '../data/gita.json');

// Helper to fetch JSON from a URL
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
  });
}

async function enrichData() {
  try {
    console.log('Downloading verse.json (global verse metadata)...');
    const versesMetadata = await fetchJson('https://raw.githubusercontent.com/gita/gita/main/data/verse.json');
    
    console.log('Downloading commentary.json (detailed explanations from all Gurus)...');
    const commentaries = await fetchJson('https://raw.githubusercontent.com/gita/gita/main/data/commentary.json');

    console.log('Downloading translation.json (translations by multiple scholars)...');
    const translations = await fetchJson('https://raw.githubusercontent.com/gita/gita/main/data/translation.json');

    console.log('Loading existing gita.json...');
    const gitaData = JSON.parse(fs.readFileSync(GITA_DATA_PATH, 'utf-8'));

    console.log('Building mapping of verse_id -> { chapter, verse }...');
    const verseIdMap = {};
    versesMetadata.forEach(v => {
      verseIdMap[v.id] = { chapter: v.chapter_number, verse: v.verse_number };
    });

    console.log('Grouping commentaries by { chapter, verse } across ALL Gurus & Acharyas...');
    const commentariesByChapVerse = {};
    
    commentaries.forEach(c => {
      const vMeta = verseIdMap[c.verse_id];
      if (!vMeta) return;

      const key = `${vMeta.chapter}-${vMeta.verse}`;
      if (!commentariesByChapVerse[key]) {
        commentariesByChapVerse[key] = [];
      }

      if (c.description && c.description.trim()) {
        commentariesByChapVerse[key].push({
          author: c.authorName || 'Traditional Acharya',
          language: c.lang || 'sanskrit',
          explanation: c.description.trim()
        });
      }
    });

    console.log('Grouping translations by { chapter, verse }...');
    const translationsByChapVerse = {};
    translations.forEach(t => {
      const vMeta = verseIdMap[t.verse_id];
      if (!vMeta) return;

      const key = `${vMeta.chapter}-${vMeta.verse}`;
      if (!translationsByChapVerse[key]) {
        translationsByChapVerse[key] = [];
      }

      if (t.description && t.description.trim()) {
        translationsByChapVerse[key].push({
          author: t.authorName || 'Scholar',
          language: t.lang || 'english',
          translation: t.description.trim()
        });
      }
    });

    console.log('Merging all Gurus explanations and translations into gita.json...');
    let updatedCount = 0;
    
    const enrichedData = gitaData.map(verse => {
      const key = `${verse.chapter_number}-${verse.verse_number}`;
      const exps = commentariesByChapVerse[key] || [];
      const transList = translationsByChapVerse[key] || [];
      
      if (exps.length > 0) {
        updatedCount++;
      }
      
      return {
        ...verse,
        detailed_explanations: exps,
        additional_translations: transList
      };
    });

    console.log(`Writing updated data to gita.json... (Added rich Guru commentaries to ${updatedCount} verses)`);
    fs.writeFileSync(GITA_DATA_PATH, JSON.stringify(enrichedData, null, 2));
    
    console.log('Success! Gita data fully enriched with all Gurus and Acharyas.');
    
  } catch (error) {
    console.error('Error enriching data:', error);
    process.exit(1);
  }
}

enrichData();
