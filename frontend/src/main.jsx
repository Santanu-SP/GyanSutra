import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';

const basename = import.meta.env.BASE_URL;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <LanguageProvider>
        <BrowserRouter basename={basename}>
          <SplashScreen>
            <App />
          </SplashScreen>
        </BrowserRouter>
      </LanguageProvider>
    </HelmetProvider>
  </StrictMode>,
);
