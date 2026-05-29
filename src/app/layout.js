import './globals.css';
import AppNav from './components/AppNav';
import { LanguageProvider } from '@/lib/LanguageContext';

export const metadata = {
  title: 'Catering Quotes',
  description: 'Catering quoting management system',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <div className="min-h-screen flex flex-col">
            <header
              className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 bg-white"
              style={{ height: 64, borderBottom: '1px solid #e8eaed', boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}
            >
              <AppNav />
            </header>
            <main style={{ marginTop: 64, flex: 1 }}>
              {children}
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
