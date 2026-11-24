import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { tokenStore } from './lib/api';
import './index.css';

// The shared login page (Next.js /login) sends admins here as /admin/sso#token=...
// (a URL fragment is never sent to any server). Store it before React mounts, then clean the URL.
if (location.pathname === '/admin/sso') {
  const t = new URLSearchParams(location.hash.slice(1)).get('token');
  if (t) tokenStore.set(t);
  history.replaceState(null, '', '/admin/dashboard');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
