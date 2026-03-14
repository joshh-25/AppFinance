// Finance App File: frontend\src\main.jsx
// Purpose: Frontend/support source file for the Finance app.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import '../shared/styles/styles.css';
import { getRuntimeConfig } from '../shared/lib/runtimeConfig.js';

const APP_BASENAME = getRuntimeConfig().basePath || '/';
const THEME_KEY = 'finance-theme';

function getInitialTheme() {
  const savedTheme = window.localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const initialTheme = getInitialTheme();
document.documentElement.setAttribute('data-theme', initialTheme);
document.documentElement.style.colorScheme = initialTheme;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={APP_BASENAME}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
