'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';

const TEXT = {
  en: {
    title: 'Quotes are generated from orders',
    body: 'Create an order first, add your menu items, then generate a quote directly from the order.',
    create: 'Create an order →',
    viewAll: '← View all orders',
  },
  fr: {
    title: 'Les devis sont générés depuis les commandes',
    body: "Créez d'abord une commande, ajoutez vos prestations, puis générez un devis directement depuis la commande.",
    create: 'Créer une commande →',
    viewAll: '← Voir toutes les commandes',
  },
  ar: {
    title: 'تُنشأ عروض الأسعار انطلاقًا من الطلبات',
    body: 'أنشئ طلبًا أولًا، وأضف أصناف القائمة، ثم أنشئ عرض السعر مباشرة من الطلب.',
    create: 'إنشاء طلب ←',
    viewAll: '→ عرض كل الطلبات',
  },
};

export default function NewQuotePage() {
  const { lang } = useLanguage();
  const tx = TEXT[lang] || TEXT.en;

  return (
    <div className="max-w-[560px] mx-auto px-6 py-20 text-center">
      <div className="text-5xl mb-4">📋</div>
      <h1 className="text-2xl font-normal text-g-text mb-3">{tx.title}</h1>
      <p className="text-[15px] text-g-text-2 mb-8 leading-relaxed">{tx.body}</p>
      <Link
        href="/orders/new"
        className="inline-flex items-center gap-2 bg-google-blue text-white rounded-full py-3 px-7 text-[15px] font-medium no-underline"
      >
        {tx.create}
      </Link>
      <div className="mt-5">
        <Link href="/orders" className="text-sm text-google-blue no-underline">
          {tx.viewAll}
        </Link>
      </div>
    </div>
  );
}
