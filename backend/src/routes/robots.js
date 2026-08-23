const express = require('express');
const router = express.Router();

router.get('/robots.txt', (req, res) => {
  const content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /login/
Disallow: /api/
Disallow: /user/settings/

Sitemap: https://gyansutraapp.com/sitemap.xml`;

  res.header('Content-Type', 'text/plain');
  res.send(content);
});

module.exports = router;
