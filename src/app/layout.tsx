import type { ReactNode } from 'react';
import './globals.css';
import NavShell from './components/NavShell';
import { ToastProvider } from './components/Toast';
import ClientErrorReporter from './components/ClientErrorReporter';
import { earlyErrorScript } from '@/lib/earlyErrorScript';
import { LanguageProvider } from '@/lib/LanguageContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { UserProvider } from '@/lib/UserContext';

export const metadata = {
  title: 'Catero',
  description: 'Catero catering management system',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Apply the saved language direction before first paint so an Arabic UI does
// not flash left-to-right while React hydrates.
const dirScript = `(function(){try{if(localStorage.getItem('lang')==='ar'){document.documentElement.dir='rtl';document.documentElement.lang='ar'}}catch(e){}})()`;

const themeScript = `(function(){var t=localStorage.getItem('theme')||'system';document.documentElement.setAttribute('data-theme',t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light')})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: earlyErrorScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: dirScript }} />
      </head>
      <body>
        <ThemeProvider>
          <UserProvider>
            <LanguageProvider>
              <ClientErrorReporter />
              <ToastProvider>
                <NavShell>{children}</NavShell>
              </ToastProvider>
            </LanguageProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
