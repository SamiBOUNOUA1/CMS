/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
    // Keep the headless-Chromium packages out of the server bundle (used for WhatsApp PDF generation).
    experimental: {
        serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
    },
};
module.exports = nextConfig;
