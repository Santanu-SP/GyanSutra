import { Link } from 'react-router-dom';
import useLanguage from '../i18n/useLanguage';

const FOOTER_COPY = {
  en: { information: 'Information', faq: 'About and FAQ', note: 'Original Sanskrit with available translations' },
  hi: { information: 'जानकारी', faq: 'परिचय और सामान्य प्रश्न', note: 'मूल संस्कृत और उपलब्ध अनुवाद' },
  bn: { information: 'তথ্য', faq: 'পরিচিতি ও সাধারণ প্রশ্ন', note: 'মূল সংস্কৃত ও উপলব্ধ অনুবাদ' },
  mr: { information: 'माहिती', faq: 'परिचय आणि सामान्य प्रश्न', note: 'मूळ संस्कृत आणि उपलब्ध अनुवाद' },
  te: { information: 'సమాచారం', faq: 'పరిచయం మరియు సాధారణ ప్రశ్నలు', note: 'మూల సంస్కృతం మరియు అందుబాటులో ఉన్న అనువాదాలు' },
  ta: { information: 'தகவல்', faq: 'அறிமுகம் மற்றும் பொதுக் கேள்விகள்', note: 'மூல சமஸ்கிருதமும் கிடைக்கும் மொழிபெயர்ப்புகளும்' },
};

export default function Footer() {
  const { language, t } = useLanguage();
  const labels = FOOTER_COPY[language] || FOOTER_COPY.en;
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
            {t('heroSubtitle')}
          </p>
        </div>

        <nav className="gs-footer__nav" aria-label="Footer navigation">
          <div className="gs-footer__nav-group">
            <p className="gs-footer__nav-title">{t('read')}</p>
            <Link to="/bhagavad-gita" className="gs-footer__link">{language === 'en' ? 'Bhagavad Gita' : t('heroTitleHighlight')}</Link>
            <Link to="/ramayana" className="gs-footer__link">{t('ramayana')}</Link>
          </div>
          <div className="gs-footer__nav-group">
            <p className="gs-footer__nav-title">{labels.information}</p>
            <Link to="/faq" className="gs-footer__link">{labels.faq}</Link>
          </div>
        </nav>
      </div>

      <div className="gs-footer__lower">
        <div className="gs-footer__lower-inner">
          <span>&copy; {currentYear} Gyan Sutra</span>
          <span>{labels.note}</span>
        </div>
      </div>
    </footer>
  );
}
