import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import enGB from './locales/en-GB.json';
import ptBR from './locales/pt-BR.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';
import zhTW from './locales/zh-TW.json';
import cs from './locales/cs.json';
import da from './locales/da.json';
import fi from './locales/fi.json';
import hu from './locales/hu.json';
import nb from './locales/nb.json';
import ru from './locales/ru.json';
import sv from './locales/sv.json';
import tr from './locales/tr.json';
import et from './locales/et.json';
import is from './locales/is.json';
import sk from './locales/sk.json';

// 24 languages — the full set selectable in Atlassian Cloud.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'en-GB': { translation: enGB },
    'pt-BR': { translation: ptBR },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
    nl: { translation: nl },
    pl: { translation: pl },
    ja: { translation: ja },
    ko: { translation: ko },
    zh: { translation: zh },
    'zh-TW': { translation: zhTW },
    cs: { translation: cs },
    da: { translation: da },
    fi: { translation: fi },
    hu: { translation: hu },
    nb: { translation: nb },
    ru: { translation: ru },
    sv: { translation: sv },
    tr: { translation: tr },
    et: { translation: et },
    is: { translation: is },
    sk: { translation: sk },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

const SUPPORTED = [
  'en', 'en-GB', 'pt-BR', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'ja', 'ko',
  'zh', 'zh-TW', 'cs', 'da', 'fi', 'hu', 'nb', 'ru', 'sv', 'tr', 'et', 'is', 'sk',
];

// Detect the Atlassian locale (e.g. 'en_US', 'pt_BR', 'zh_Hant', 'nb_NO') and
// map it to the closest supported language.
export function applyLocale(locale) {
  if (!locale) return;
  const norm = String(locale).replace('_', '-'); // en-US, zh-Hant, nb-NO…
  const lower = norm.toLowerCase();
  let lang;
  if (/^zh.*(hant|tw|hk|mo)/i.test(norm)) lang = 'zh-TW';        // Traditional Chinese
  else if (/^zh/i.test(norm)) lang = 'zh';                       // Simplified Chinese
  else if (/^en.*gb/i.test(norm)) lang = 'en-GB';               // British English
  else if (/^pt/i.test(norm)) lang = 'pt-BR';                    // any Portuguese → pt-BR
  else if (/^(nb|nn|no)/i.test(norm)) lang = 'nb';               // Norwegian variants
  else {
    lang = SUPPORTED.find(l => lower === l.toLowerCase())
        || SUPPORTED.find(l => lower.startsWith(l.split('-')[0].toLowerCase()));
  }
  if (lang) i18n.changeLanguage(lang);
}

export default i18n;
