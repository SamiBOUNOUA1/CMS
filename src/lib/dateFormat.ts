import { format as dfFormat } from 'date-fns';
import { fr, enUS, arMA } from 'date-fns/locale';

type DateLang = 'en' | 'fr' | 'ar';

// Current UI language, kept in sync by LanguageProvider.
let currentLang: DateLang = 'en';

export function setDateLang(lang: DateLang) {
  currentLang = lang;
}

const LOCALES = { en: enUS, fr, ar: arMA };

/** date-fns `format` that uses the current UI language (month/day names). */
export function format(date: Date | number, pattern: string): string {
  return dfFormat(date, pattern, { locale: LOCALES[currentLang] || enUS });
}
