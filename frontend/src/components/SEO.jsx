import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title = "Gyan Sutra — Thread of Knowledge",
  description = "Explore the Bhagavad Gita and Valmiki Ramayana through authentic texts, semantic search, related verses, commentaries, and Sarathi.",
  canonical,
  type = "website",
  image = "https://gyansutraapp.pages.dev/linkedin/gyan-sutra-linkedin-cover.png",
  path = ""
}) {
  const siteUrl = "https://gyansutraapp.com";
  const currentUrl = canonical || `${siteUrl}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
