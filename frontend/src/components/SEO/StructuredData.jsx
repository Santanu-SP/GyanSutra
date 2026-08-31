export function OrganizationSchema({ 
  name = "Gyan Sutra", 
  url = "https://gyansutraapp.com",
  logo = "https://gyansutraapp.pages.dev/icons/logo.svg",
  description = "Read the Bhagavad Gita and Valmiki Ramayana in Sanskrit and English."
} = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": name,
    "url": url,
    "logo": logo,
    "description": description
  };
}

export function WebApplicationSchema({
  name = "Gyan Sutra",
  applicationCategory = "LifestyleApplication",
  operatingSystem = "Any",
  offers = { price: 0, priceCurrency: "USD" }
} = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": name,
    "applicationCategory": applicationCategory,
    "operatingSystem": operatingSystem,
    "offers": {
      "@type": "Offer",
      "price": offers.price,
      "priceCurrency": offers.priceCurrency || "USD"
    }
  };
}

export function FAQPageSchema(faqs = []) {
  if (!faqs || faqs.length === 0) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}
