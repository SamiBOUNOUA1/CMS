// French number-to-words for invoice totals
// ("Arrêtée la présente facture à la somme de : mille deux cents dirhams TTC").
// Plain module — usable on server and client.

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

/** 0 < n < 100. `plural` = may take the plural "s" (quatre-vingts) — false before "mille". */
function below100(n: number, plural: boolean): string {
  if (n < 17) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7) return u === 1 ? 'soixante et onze' : `soixante-${below100(10 + u, plural)}`;
  if (t === 9) return `quatre-vingt-${below100(10 + u, plural)}`;
  if (t === 8) return u === 0 ? `quatre-vingt${plural ? 's' : ''}` : `quatre-vingt-${UNITS[u]}`;
  if (u === 0) return TENS[t];
  if (u === 1) return `${TENS[t]} et un`;
  return `${TENS[t]}-${UNITS[u]}`;
}

/** 0 < n < 1000. */
function below1000(n: number, plural: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h === 1) parts.push('cent');
  else if (h > 1) parts.push(`${UNITS[h]} cent${r === 0 && plural ? 's' : ''}`);
  if (r) parts.push(below100(r, plural));
  return parts.join(' ');
}

/** Non-negative integer → French words. */
export function integerToFrenchWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'zéro';
  const parts: string[] = [];
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const thousands = Math.floor((n % 1e6) / 1e3);
  const rest = n % 1e3;
  if (billions) parts.push(`${below1000(billions, true)} milliard${billions > 1 ? 's' : ''}`);
  if (millions) parts.push(`${below1000(millions, true)} million${millions > 1 ? 's' : ''}`);
  if (thousands) parts.push(thousands === 1 ? 'mille' : `${below1000(thousands, false)} mille`);
  if (rest) parts.push(below1000(rest, true));
  return parts.join(' ');
}

function currencyNames(currency: string): [string, string, string] {
  const c = String(currency || '').trim().toUpperCase();
  if (['MAD', 'DH', 'DHS', 'DIRHAM', 'DIRHAMS'].includes(c)) return ['dirham', 'dirhams', 'centimes'];
  if (['€', 'EUR', 'EURO', 'EUROS'].includes(c)) return ['euro', 'euros', 'centimes'];
  if (['$', 'USD'].includes(c)) return ['dollar', 'dollars', 'cents'];
  return [c, c, 'centimes'];
}

/** 1234.5 → "Mille deux cent trente-quatre dirhams et cinquante centimes". */
export function amountToFrenchWords(amount: number, currency = 'MAD'): string {
  const cents = Math.round(Math.abs(Number(amount) || 0) * 100);
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  const [one, many, sub] = currencyNames(currency);
  // "un million de dirhams" — "de" after million/milliard when nothing follows.
  const words = integerToFrenchWords(whole);
  const de = /(million|milliard)s?$/.test(words) ? ' de' : '';
  let out = `${words}${de} ${whole > 1 ? many : one}`;
  if (frac) out += ` et ${integerToFrenchWords(frac)} ${sub}`;
  return out.charAt(0).toUpperCase() + out.slice(1);
}
