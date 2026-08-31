import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="gs-footer">
      <div className="gs-footer__inner">
        <div>
          <Link to="/" className="gs-footer__brand" aria-label="Gyan Sutra home">
            <img src={`${import.meta.env.BASE_URL}icons/logo.svg`} alt="Gyan Sutra" className="h-6 w-6" />
            <span className="gs-footer__brand-name">Gyan Sutra</span>
          </Link>
          <p className="gs-footer__summary">
            Read the Bhagavad Gita and Valmiki Ramayana in Sanskrit and English.
          </p>
        </div>

        <div className="gs-footer__meta">
          <Link to="/faq" className="gs-footer__link">About and FAQ</Link>
          <span>&copy; {currentYear} Gyan Sutra</span>
        </div>
      </div>
    </footer>
  );
}
