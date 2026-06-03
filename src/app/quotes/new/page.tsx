'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';

export default function NewQuotePage() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';

  return (
    <div className="max-w-[560px] mx-auto px-6 py-20 text-center">
      <div className="text-5xl mb-4">📋</div>
      <h1 className="text-2xl font-normal text-[#202124] mb-3">
        {fr ? 'Les devis sont générés depuis les commandes' : 'Quotes are generated from orders'}
      </h1>
      <p className="text-[15px] text-[#5f6368] mb-8 leading-relaxed">
        {fr
          ? "Créez d'abord une commande, ajoutez vos prestations, puis générez un devis directement depuis la commande."
          : 'Create an order first, add your menu items, then generate a quote directly from the order.'}
      </p>
      <Link
        href="/orders/new"
        className="inline-flex items-center gap-2 bg-google-blue text-white rounded-full py-3 px-7 text-[15px] font-medium no-underline"
      >
        {fr ? 'Créer une commande →' : 'Create an order →'}
      </Link>
      <div className="mt-5">
        <Link href="/orders" className="text-sm text-google-blue no-underline">
          {fr ? '← Voir toutes les commandes' : '← View all orders'}
        </Link>
      </div>
    </div>
  );
}
