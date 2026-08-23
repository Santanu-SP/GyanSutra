import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-amber-900/20 bg-[color:var(--bg-surface)] py-8 mt-auto">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
        
        {/* Brand / Left */}
        <div className="flex flex-col items-center sm:items-start gap-2">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={`${import.meta.env.BASE_URL}icons/logo.svg`} alt="Gyan Sutra" className="h-6 w-6" />
            <span className="font-serif text-lg font-medium text-[color:var(--text-primary)]">
              Gyan Sutra
            </span>
          </Link>
          <p className="text-xs text-[color:var(--text-muted)] text-center sm:text-left">
            Ancient wisdom for modern seekers.
          </p>
        </div>

        {/* Links / Center */}
        <nav aria-label="Footer Navigation">
          <ul className="flex items-center gap-6 text-sm font-medium text-[color:var(--text-secondary)]">
            <li>
              <Link to="/bhagavad-gita" className="hover:text-[color:var(--accent)] transition-colors">
                Gita
              </Link>
            </li>
            <li>
              <Link to="/ramayana" className="hover:text-[color:var(--accent)] transition-colors">
                Ramayana
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-[color:var(--accent)] transition-colors">
                FAQ
              </Link>
            </li>
          </ul>
        </nav>

        {/* Copyright / Right */}
        <div className="text-xs text-[color:var(--text-muted)]">
          &copy; {currentYear} Gyan Sutra. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
