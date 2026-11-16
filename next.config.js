/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

// Inline scripts are allowed because Next.js and the theme/error bootstrap in
// app/layout.tsx use them; everything else is limited to this site plus the few
// services the UI calls (Google Fonts, OpenStreetMap tiles and address search).
const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' https://nominatim.openstreetmap.org${isProd ? '' : ' ws: wss:'}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
if (isProd) {
    securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
    });
}

const nextConfig = {
    poweredByHeader: false,
    distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
    // Keep the headless-Chromium packages out of the server bundle (used for WhatsApp PDF generation).
    experimental: {
        serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
    },
    async headers() {
        return [{ source: '/:path*', headers: securityHeaders }];
    },
};
module.exports = nextConfig;
