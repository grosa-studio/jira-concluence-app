import React from 'react';
import ReactDOM from 'react-dom/client';
import { view } from '@forge/bridge';
import './i18n/index.js';
import { applyLocale } from './i18n/index.js';
import './index.css';
import App from './App.jsx';

view.getContext().then(ctx => {
  applyLocale(ctx?.locale);
}).catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
