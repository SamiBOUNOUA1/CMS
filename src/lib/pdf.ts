import puppeteer, { type Browser } from 'puppeteer-core';
import { signToken } from '@/lib/auth';
import { buildPermissions } from '@/lib/permissions';

// Common local Chrome/Edge install locations, used as a dev fallback when no
// PUPPETEER_EXECUTABLE_PATH is set and we are not in a serverless environment.
const LOCAL_CHROME_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean) as string[];

async function launchBrowser(): Promise<Browser> {
  // In production / serverless (Cloud Run), use the bundled serverless Chromium.
  if (process.env.NODE_ENV === 'production' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local development: use an installed Chrome/Edge.
  const fs = await import('fs');
  const executablePath = LOCAL_CHROME_PATHS.find(p => {
    try { return fs.existsSync(p); } catch { return false; }
  });
  if (!executablePath) {
    throw new Error('No Chrome/Edge executable found. Set PUPPETEER_EXECUTABLE_PATH to a Chrome binary.');
  }
  return puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
}

/** Mints a short-lived admin token so Puppeteer can load auth-gated pages. */
async function mintInternalToken(): Promise<string> {
  return signToken({
    id: 'whatsapp-pdf-bot',
    role: 'admin',
    permissions: buildPermissions('admin'),
  });
}

/**
 * Renders an app page to a PDF buffer by loading it in headless Chromium with
 * an internal auth cookie. The buffer is never written to disk — the caller is
 * responsible for using it and letting it be garbage-collected.
 */
export async function renderPagePdf(origin: string, path: string): Promise<Buffer> {
  const token = await mintInternalToken();
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setCookie({ name: 'cq_token', value: token, url: origin });
    await page.goto(`${origin}${path}`, { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.emulateMediaType('print');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    if (browser) await browser.close();
  }
}
