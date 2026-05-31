'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';

export default function NewQuotePage() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
      <h1 style={{ fontFamily: "'Google Sans'", fontSize: 24, fontWeight: 400, color: '#202124', margin: '0 0 12px' }}>
        {fr ? 'Les devis sont générés depuis les commandes' : 'Quotes are generated from orders'}
      </h1>
      <p style={{ fontSize: 15, color: '#5f6368', margin: '0 0 32px', lineHeight: 1.6 }}>
        {fr
          ? 'Créez d\'abord une commande, ajoutez vos prestations, puis générez un devis directement depuis la commande.'
          : 'Create an order first, add your menu items, then generate a quote directly from the order.'}
      </p>
      <Link
        href="/orders/new"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#1a73e8', color: '#fff', border: 'none',
          borderRadius: 24, padding: '12px 28px',
          fontSize: 15, fontFamily: "'Google Sans'", fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        {fr ? 'Créer une commande →' : 'Create an order →'}
      </Link>
      <div style={{ marginTop: 20 }}>
        <Link href="/orders" style={{ fontSize: 14, color: '#1a73e8', textDecoration: 'none' }}>
          {fr ? '← Voir toutes les commandes' : '← View all orders'}
        </Link>
      </div>
    </div>
  );
}
