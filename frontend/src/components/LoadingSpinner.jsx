import './LoadingSpinner.css';

export default function LoadingSpinner({ fullPage = false, size = 'medium', text }) {
  return (
    <div 
      className={`gs-loader ${fullPage ? 'gs-loader--full' : 'gs-loader--inline'} gs-loader--${size}`}
      role="status"
      aria-label={text || "Loading..."}
    >
      <div className="gs-loader__container">
        <div className="gs-loader__ring" />
        <img 
          src="/icons/logo.svg" 
          className="gs-loader__logo" 
          alt="" 
          aria-hidden="true" 
        />
      </div>
      {text && <span className="gs-loader__text">{text}</span>}
    </div>
  );
}
