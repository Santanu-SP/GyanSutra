const express = require('express');
const router = express.Router();

router.get('/sitemap.xml', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  const addUrl = (path, priority, changefreq) => {
    xml += `  <url>\n    <loc>https://gyansutraapp.com${path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  };

  // Static pages
  const statics = ['/', '/ramayana', '/gita', '/sarathi', '/faq', '/about', '/blog', '/search', '/contact'];
  statics.forEach(p => addUrl(p, '0.8', 'monthly'));

  // Ramayana Kanda & Sarga pages
  const kandas = [
    { name: 'bala-kanda', sargas: 77 },
    { name: 'ayodhya-kanda', sargas: 119 },
    { name: 'aranya-kanda', sargas: 75 },
    { name: 'kishkindha-kanda', sargas: 67 },
    { name: 'sundara-kanda', sargas: 68 },
    { name: 'yuddha-kanda', sargas: 128 },
    { name: 'uttara-kanda', sargas: 111 }
  ];
  
  kandas.forEach(k => {
    addUrl(`/ramayana/${k.name}`, '0.9', 'weekly');
    for (let i = 1; i <= k.sargas; i++) {
      addUrl(`/ramayana/${k.name}/${i}`, '0.7', 'monthly');
    }
  });

  // Gita chapters & verses
  const gitaChapters = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78];
  gitaChapters.forEach((verseCount, index) => {
    const ch = index + 1;
    addUrl(`/gita/${ch}`, '0.9', 'weekly');
    for (let v = 1; v <= verseCount; v++) {
      addUrl(`/gita/${ch}/${v}`, '0.7', 'monthly');
    }
  });

  // Topic pages
  const topics = [
    '/topics/karma-yoga', '/topics/bhakti-yoga', '/topics/dharma', 
    '/topics/moksha', '/topics/meditation', '/topics/ramayana-teachings', 
    '/topics/gita-for-daily-life'
  ];
  topics.forEach(t => addUrl(t, '0.8', 'monthly'));

  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

module.exports = router;
