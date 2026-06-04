import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

i18n.use(initReactI18next).init({
  resources: {
    en:    { translation: en },
    'pt-BR': { translation: ptBR },
    es:    { translation: es },
    fr:    { translation: fr },
    de:    { translation: de },
    it:    { translation: it },
    nl:    { translation: nl },
    pl:    { translation: pl },
    ja:    { translation: ja },
    zh:    { translation: zh },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Detect Atlassian locale from Forge context and switch language.
// Called from main.jsx after view.getContext() resolves.
export function applyLocale(locale) {
  if (!locale) return;
  // Atlassian locales: 'en_US', 'pt_BR', 'zh_Hans', etc.
  const normalized = locale.replace('_', '-');
  const supported = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'ja', 'zh'];
  // Exact match first, then language-only match
  const lang = supported.find(l => normalized === l)
    || supported.find(l => normalized.startsWith(l.split('-')[0]));
  if (lang) i18n.changeLanguage(lang);
}

export default i18n;
