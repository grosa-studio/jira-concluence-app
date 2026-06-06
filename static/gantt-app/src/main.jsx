import React from 'react';
import ReactDOM from 'react-dom/client';
import { view } from '@forge/bridge';
import './i18n/index.js';
import { applyLocale } from './i18n/index.js';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import './index.css';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary';

view.getContext().then(ctx => {
  applyLocale(ctx?.locale);
}).catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App /></ErrorBoundary>
);
