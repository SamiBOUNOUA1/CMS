import { format as dfFormat } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

// Current UI language, kept in sync by LanguageProvider.
let currentLang: 'en' | 'fr' = 'en';

export function setDateLang(lang: 'en' | 'fr') {
  currentLang = lang;
}

/** date-fns `format` that uses the current UI language (month/day names). */
export function format(date: Date | number, pattern: string): string {
  return dfFormat(date, pattern, { locale: currentLang === 'fr' ? fr : enUS });
}
