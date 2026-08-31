import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="gs-footer">
      <div className="gs-footer__inner">
        <div className="gs-footer__about">
          <Link to="/" className="gs-footer__brand" aria-label="Gyan Sutra home">
            <img src={`${import.meta.env.BASE_URL}icons/logo.svg`} alt="Gyan Sutra" className="h-6 w-6" />
            <span className="gs-footer__brand-name">Gyan Sutra</span>
          </Link>
          <p className="gs-footer__summary">
            Read the Bhagavad Gita and Valmiki Ramayana in Sanskrit and English.
          </p>
        </div>

        <nav className="gs-footer__nav" aria-label="Footer navigation">
          <div className="gs-footer__nav-group">
            <p className="gs-footer__nav-title">Read</p>
            <Link to="/bhagavad-gita" className="gs-footer__link">Bhagavad Gita</Link>
            <Link to="/ramayana" className="gs-footer__link">Valmiki Ramayana</Link>
          </div>
          <div className="gs-footer__nav-group">
            <p className="gs-footer__nav-title">Information</p>
            <Link to="/faq" className="gs-footer__link">About and FAQ</Link>
          </div>
        </nav>
      </div>

      <div className="gs-footer__lower">
        <div className="gs-footer__lower-inner">
          <span>&copy; {currentYear} Gyan Sutra</span>
          <span>Sanskrit text with English translation</span>
        </div>
      </div>
    </footer>
  );
}
