import { Helmet } from 'react-helmet-async';

export default function SEOHead({
  title = "Thread of Knowledge",
  description = "Explore the Bhagavad Gita and Valmiki Ramayana through authentic texts, semantic search, related verses, commentaries, and Sarathi.",
  canonical = "",
  ogImage = "https://gyansutraapp.pages.dev/linkedin/gyan-sutra-linkedin-cover.png",
  noindex = false,
  schemaData = null
}) {
  const siteUrl = "https://gyansutraapp.com";
  
  // Format title up to ~60 chars
  const fullTitle = `${title} | Gyan Sutra`.substring(0, 60);
  
  // Format description up to ~160 chars
  const fullDesc = description.substring(0, 160);
  
  // Ensure canonical URL is complete
  const canonicalUrl = canonical.startsWith('http') 
    ? canonical 
    : `${siteUrl}${canonical.startsWith('/') ? canonical : `/${canonical}`}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDesc} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots indexing */}
      <meta name="robots" content={noindex ? "noindex,nofollow" : "index,follow"} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Gyan Sutra" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDesc} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDesc} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data (JSON-LD) */}
      {schemaData && (
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      )}
    </Helmet>
  );
}
