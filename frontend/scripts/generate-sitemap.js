import fs from 'fs';
import path from 'path';

// This script generates a sitemap.xml for the Gyansutra app.
// It statically maps known routes for the SPA.
const DOMAIN = 'https://gyansutraapp.com';

const routes = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/search', changefreq: 'weekly', priority: 0.8 },
  { url: '/bhagavad-gita', changefreq: 'weekly', priority: 0.9 },
  { url: '/ramayana', changefreq: 'weekly', priority: 0.9 },
  // Note: Dynamic routes like /verses/:id or /chapters/:id can be added 
  // by querying the backend API or parsing static data, but for a fast,
  // autonomous pass without logic changes, we'll map the core layouts.
];

const generateSitemap = () => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  routes.forEach(route => {
    xml += `
  <url>
    <loc>${DOMAIN}${route.url}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
  });

  xml += `
</urlset>`;

  const publicDir = path.resolve(process.cwd(), 'public');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Generated sitemap.xml at ${sitemapPath}`);
};

generateSitemap();
