import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import SplashScreen from './components/SplashScreen.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SplashScreen>
        <App />
      </SplashScreen>
    </BrowserRouter>
  </StrictMode>,
);
