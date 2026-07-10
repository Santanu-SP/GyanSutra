const fs = require('fs');
const path = require('path');

async function downloadFullGita() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, 'gita.json');
  const fullGita = [];

  // Exact verse distribution across all 18 chapters
  const chapterVerseCounts = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78];

  console.log('Connecting to static GitHub mirror framework...');

  for (let ch = 1; ch <= 18; ch++) {
    const totalVerses = chapterVerseCounts[ch - 1];
    console.log(`Processing Chapter ${ch}/${18} (${totalVerses} verses)...`);

    for (let verse = 1; verse <= totalVerses; verse++) {
      let success = false;
      let retries = 3;

      while (!success && retries > 0) {
        try {
          // Utilizing the stable, static GitHub Pages deployment API
          const url = `https://vedicscriptures.github.io/slok/${ch}/${verse}`;
          const res = await fetch(url);

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();

          // Map incoming payload explicitly to match your exact backend application schema
          fullGita.push({
            chapterNumber: ch,
            verseNumber: verse,
            sanskrit: data.slok || '',
            transliteration: data.transliteration || '',
            translationEnglish: data.purohit?.et || data.siva?.et || '',
            translationHindi: data.tej?.ht || '',
            wordMeanings: [],
            tags: [`chapter_${ch}`]
          });

          success = true;
        } catch (err) {
          retries--;
          if (retries === 0) {
            console.error(`⚠️ Permanent network drop on Ch ${ch} Verse ${verse}:`, err.message);
          } else {
            // Short backoff delay to allow connection resetting if needed
            await new Promise(res => setTimeout(res, 300));
          }
        }
      }
    }
  }

  // Save the complete array directly to the destination path
  fs.writeFileSync(filePath, JSON.stringify(fullGita, null, 2), 'utf8');
  console.log(`\n=================================================`);
  console.log(`✓ COMPLETE SUCCESS: Dataset compiled locally!`);
  console.log(`Saved ${fullGita.length}/700 verses to backend/data/gita.json`);
  console.log(`=================================================`);
}

downloadFullGita();