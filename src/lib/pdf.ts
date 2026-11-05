import puppeteer, { type Browser } from 'puppeteer-core';
import { signToken } from '@/lib/auth';
import { buildPermissions } from '@/lib/permissions';
import { getTenantId } from '@/lib/tenantContext';
import { logError } from '@/lib/logger';

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

/**
 * Unpacks @sparticuz/chromium into /tmp and returns the binary path.
 *
 * The package only unpacks the system libraries Chromium needs when it detects
 * AWS Lambda, and Cloud Run has none of them. It has two library bundles, and
 * we need both: "al2023" has the current NSS libraries (libnss3, libnspr4...),
 * "al2" has libsqlite3 and libuuid, which NSS also loads. So we pose as both
 * Lambda runtimes while unpacking, then put both folders on the library path
 * (al2023 first, so its newer NSS wins).
 */
async function unpackServerlessChromium(): Promise<string> {
  const saved = {
    AWS_EXECUTION_ENV: process.env.AWS_EXECUTION_ENV,
    AWS_LAMBDA_JS_RUNTIME: process.env.AWS_LAMBDA_JS_RUNTIME,
  };
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs18.x'; // → unpacks al2
  process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs22.x';        // → unpacks al2023
  try {
    // The package skips all unpacking once /tmp/chromium exists, so an instance
    // that unpacked before (without al2) would never get libsqlite3. Redo it.
    const fs = await import('fs');
    if (fs.existsSync('/tmp/chromium') && !fs.existsSync('/tmp/al2/lib/libsqlite3.so.0')) {
      fs.rmSync('/tmp/chromium', { force: true });
    }
    const chromium = (await import('@sparticuz/chromium')).default;
    // PDFs don't need WebGL; skips the software GPU stack, a common crash source.
    chromium.setGraphicsMode = false;
    const executablePath = await chromium.executablePath();
    const libDirs = ['/tmp/al2023/lib', '/tmp/al2/lib'];
    const rest = (process.env.LD_LIBRARY_PATH ?? '').split(':').filter(p => p && !libDirs.includes(p));
    process.env.LD_LIBRARY_PATH = [...libDirs, ...rest].join(':');
    process.env.FONTCONFIG_PATH ??= '/tmp/fonts';
    return executablePath;
  } finally {
    // Don't leave the fake Lambda markers set: other libraries read them.
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function launchBrowser(): Promise<Browser> {
  // In production / serverless (Cloud Run), use the bundled serverless Chromium.
  if (process.env.NODE_ENV === 'production' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const executablePath = await unpackServerlessChromium();
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      // --single-process is meant for AWS Lambda; on Cloud Run it crashes the
      // tab mid-navigation ("Navigating frame was detached").
      args: chromium.args.filter(a => a !== '--single-process'),
      defaultViewport: chromium.defaultViewport,
      executablePath,
      // The bundled binary is chrome-headless-shell, so use its headless mode.
      headless: chromium.headless,
      // Pipe Chromium's own stderr into the server logs so crashes are diagnosable.
      dumpio: true,
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

/**
 * Mints a short-lived admin token so Puppeteer can load auth-gated pages. It is
 * bound to the calling request's tenant, so the bot only sees that tenant's data.
 */
async function mintInternalToken(): Promise<string> {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('PDF rendering requires a tenant context');
  return signToken({
    id: 'whatsapp-pdf-bot',
    role: 'admin',
    permissions: buildPermissions('admin'),
    tenantId,
  });
}

/**
 * Renders an app page to a PDF buffer by loading it in headless Chromium with
 * an internal auth cookie. The buffer is never written to disk — the caller is
 * responsible for using it and letting it be garbage-collected.
 */
export async function renderPagePdf(requestOrigin: string, path: string): Promise<Buffer> {
  // In production (Cloud Run) the request origin is the container's internal
  // address with the proxy's https scheme (e.g. https://0.0.0.0:8080), which
  // doesn't work. Load the page straight from this server over plain http.
  const origin = process.env.NODE_ENV === 'production'
    ? `http://127.0.0.1:${process.env.PORT || 8080}`
    : requestOrigin;
  const token = await mintInternalToken();
  // Recent Chromium events, attached to the error log if rendering fails.
  const trail: string[] = [];
  const note = (s: string) => { trail.push(s.slice(0, 300)); if (trail.length > 40) trail.shift(); };
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    browser.process()?.stderr?.on('data', (d: Buffer) => {
      for (const line of d.toString().split('\n')) if (line.trim()) note(`stderr: ${line.trim()}`);
    });
    browser.process()?.on('exit', (code, signal) => note(`chromium exited code=${code} signal=${signal}`));
    // Reuse the tab Chromium opens on launch instead of creating a second one.
    const page = (await browser.pages())[0] ?? await browser.newPage();
    page.on('error', err => note(`tab crashed: ${err.message}`));
    page.on('pageerror', err => note(`page js error: ${(err as Error).message}`));
    page.on('requestfailed', r => note(`request failed: ${r.url()} ${r.failure()?.errorText ?? ''}`));
    page.on('response', r => { if (r.status() >= 300) note(`HTTP ${r.status()} ${r.url()}`); });
    page.on('framenavigated', f => { if (f === page.mainFrame()) note(`navigated: ${f.url()}`); });
    await page.setCookie({ name: 'cq_token', value: token, url: origin });
    await page.goto(`${origin}${path}`, { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.emulateMediaType('print');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } catch (err) {
    const e = err as Error;
    const detail = `PDF render failed (${path}): ${e?.message}\n--- Chromium trail ---\n${trail.join('\n') || '(nothing recorded)'}`;
    await logError(Object.assign(new Error(detail), { name: 'PdfRenderError' }), { stack: detail });
    throw err;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
