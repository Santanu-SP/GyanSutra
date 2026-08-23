import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items }) {
  if (!items || items.length === 0) return null;

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": `https://gyansutraapp.com${item.path}`
    }))
  };

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-[color:var(--text-muted)]">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.path} className="flex items-center gap-2">
                {isLast ? (
                  <span className="text-[color:var(--text-primary)]" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <>
                    <Link 
                      to={item.path} 
                      className="hover:text-[color:var(--accent)] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/50 rounded"
                    >
                      {item.label}
                    </Link>
                    <span className="text-[color:var(--border)] select-none" aria-hidden="true">
                      &gt;
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
