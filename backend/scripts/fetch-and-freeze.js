const fs = require('fs');
const path = require('path');

async function freezeData() {
    console.log('Downloading and freezing the 700-verse multi-lingual dataset...');
    const allVerses = [];

    // Total verses per chapter in the Bhagavad Gita
    const verseCounts = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78];

    for (let ch = 1; ch <= 18; ch++) {
        console.log(`Fetching Chapter ${ch}...`);
        for (let v = 1; v <= verseCounts[ch - 1]; v++) {
            try {
                const res = await fetch(`https://vedicscriptures.github.io/slok/${ch}/${v}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                allVerses.push({
                    chapter_number: ch,
                    verse_number: v,
                    sanskrit: data.slok || '',
                    transliteration: data.transliteration || '',
                    english: data.siva?.et || '',
                    hindi: data.tej?.ht || '',
                    word_meanings: data.siva?.ec || ''
                });
            } catch (err) {
                console.error(`❌ Failed to fetch ${ch}.${v}:`, err.message);
            }
        }
    }

    const targetPath = path.join(__dirname, '../data/gita.json');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(allVerses, null, 2), 'utf8');
    console.log(`\n🎉 Success! Dataset completely frozen locally at: ${targetPath}`);
}

freezeData();