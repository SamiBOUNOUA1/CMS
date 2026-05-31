import './globals.css';
import AppNav from './components/AppNav';
import { LanguageProvider } from '@/lib/LanguageContext';
import { ThemeProvider } from '@/lib/ThemeContext';

export const metadata = {
  title: 'Catering Quotes',
  description: 'Catering quoting management system',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

const themeScript = `(function(){var t=localStorage.getItem('theme')||'system';document.documentElement.setAttribute('data-theme',t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light')})()`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <div className="min-h-screen flex flex-col">
              <header
                className="fixed top-0 left-0 right-0 z-50 flex items-center px-4"
                style={{ height: 64, background: 'var(--google-surface)', borderBottom: '1px solid var(--google-border)', boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}
              >
                <AppNav />
              </header>
              <main style={{ marginTop: 64, flex: 1 }}>
                {children}
              </main>
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
