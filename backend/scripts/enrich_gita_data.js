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
    
    console.log('Downloading commentary.json (detailed explanations)...');
    const commentaries = await fetchJson('https://raw.githubusercontent.com/gita/gita/main/data/commentary.json');

    console.log('Loading existing gita.json...');
    const gitaData = JSON.parse(fs.readFileSync(GITA_DATA_PATH, 'utf-8'));

    console.log('Building mapping of verse_id -> { chapter, verse }...');
    const verseIdMap = {};
    versesMetadata.forEach(v => {
      verseIdMap[v.id] = { chapter: v.chapter_number, verse: v.verse_number };
    });

    console.log('Grouping commentaries by { chapter, verse }...');
    const commentariesByChapVerse = {};
    
    commentaries.forEach(c => {
      const vMeta = verseIdMap[c.verse_id];
      if (!vMeta) return;

      const key = `${vMeta.chapter}-${vMeta.verse}`;
      if (!commentariesByChapVerse[key]) {
        commentariesByChapVerse[key] = [];
      }

      // Author 16 is Swami Sivananda (English)
      // Author 2 is Swami Chinmayananda (Hindi)
      const isSivananda = c.authorName === 'Swami Sivananda' && c.lang === 'english';
      const isChinmayananda = c.authorName === 'Swami Chinmayananda' && c.lang === 'hindi';
      
      if (isSivananda || isChinmayananda) {
        commentariesByChapVerse[key].push({
          author: c.authorName,
          language: c.lang,
          explanation: c.description
        });
      }
    });

    console.log('Merging explanations into gita.json...');
    let updatedCount = 0;
    
    const enrichedData = gitaData.map(verse => {
      const key = `${verse.chapter_number}-${verse.verse_number}`;
      const exps = commentariesByChapVerse[key] || [];
      
      if (exps.length > 0) {
        updatedCount++;
      }
      
      return {
        ...verse,
        detailed_explanations: exps
      };
    });

    console.log(`Writing updated data to gita.json... (Added explanations to ${updatedCount} verses)`);
    fs.writeFileSync(GITA_DATA_PATH, JSON.stringify(enrichedData, null, 2));
    
    console.log('Success! Data enriched.');
    
  } catch (error) {
    console.error('Error enriching data:', error);
    process.exit(1);
  }
}

enrichData();
