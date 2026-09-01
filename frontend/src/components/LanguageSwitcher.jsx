import useLanguage from '../i18n/useLanguage';

export default function LanguageSwitcher() {
  const { language, setLanguage, languages, t } = useLanguage();
  return (
    <label className="language-switcher" title={t('changeLanguage')}>
      <span className="sr-only">{t('changeLanguage')}</span>
      <span aria-hidden="true" className="language-switcher__icon">文</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('changeLanguage')}>
        {languages.map((item) => <option key={item.code} value={item.code}>{item.nativeName}</option>)}
      </select>
    </label>
  );
}
