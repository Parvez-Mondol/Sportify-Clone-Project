import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LibraryProvider } from './context/LibraryContext';
import { PlayerProvider } from './context/PlayerContext';
import { ToastProvider } from './components/Toast';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <LibraryProvider>
            <PlayerProvider>
              <App />
            </PlayerProvider>
          </LibraryProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
