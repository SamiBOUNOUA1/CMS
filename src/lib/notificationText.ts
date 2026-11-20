// Turns a stored notification (type + params) into a title/body in the reader's
// language. Shared by the bell/page (client) and notification emails (server),
// so it must stay free of server-only imports.
import { formatMoney } from '@/lib/money';

type Lang = 'en' | 'fr' | 'ar';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = Record<string, any>;

export const NOTIFICATION_GROUP_LABELS: Record<Lang, Record<string, string>> = {
  en: { event: 'Events', task: 'Tasks', sales: 'Sales & payments', stock: 'Stock & laundry', system: 'Account' },
  fr: { event: 'Événements', task: 'Tâches', sales: 'Ventes et paiements', stock: 'Stock et blanchisserie', system: 'Compte' },
  ar: { event: 'المناسبات', task: 'المهام', sales: 'المبيعات والمدفوعات', stock: 'المخزون والغسيل', system: 'الحساب' },
};

const ROLE_LABELS: Record<Lang, Record<string, string>> = {
  en: { manager: 'manager', materials: 'materials', kitchen: 'kitchen', staff: 'staff', logistics: 'logistics', other: 'team member' },
  fr: { manager: 'responsable', materials: 'matériel', kitchen: 'cuisine', staff: 'personnel', logistics: 'logistique', other: 'membre de l\'équipe' },
  ar: { manager: 'مدير', materials: 'المعدات', kitchen: 'المطبخ', staff: 'الطاقم', logistics: 'اللوجستيك', other: 'عضو في الفريق' },
};

const TASK_LABELS: Record<Lang, Record<string, string>> = {
  en: { call: 'Call', message: 'Message', other: 'Task' },
  fr: { call: 'Appel', message: 'Message', other: 'Tâche' },
  ar: { call: 'مكالمة', message: 'رسالة', other: 'مهمة' },
};

const CHANGE_LABELS: Record<Lang, Record<string, string>> = {
  en: { eventDate: 'date', startTime: 'start time', guestCount: 'guest count', eventLocation: 'venue' },
  fr: { eventDate: 'date', startTime: 'heure de début', guestCount: 'nombre d\'invités', eventLocation: 'lieu' },
  ar: { eventDate: 'التاريخ', startTime: 'وقت البدء', guestCount: 'عدد الضيوف', eventLocation: 'المكان' },
};

function fmtDate(value: unknown, lang: Lang): string {
  if (!value) return '';
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'ar' ? 'ar-MA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const money = (p: Params) => formatMoney(p.amount, p.currency || '€');

type Renderer = (p: Params, lang: Lang) => { title: string; body: string };

const R: Record<string, Record<Lang, Renderer>> = {
  // ── Event team ──
  event_assigned: {
    en: p => ({ title: 'You were added to an event', body: `${p.client} — ${fmtDate(p.date, 'en')}${p.role ? ` · role: ${ROLE_LABELS.en[p.role] || p.role}` : ''}` }),
    fr: p => ({ title: 'Vous avez été ajouté à un événement', body: `${p.client} — ${fmtDate(p.date, 'fr')}${p.role ? ` · rôle : ${ROLE_LABELS.fr[p.role] || p.role}` : ''}` }),
    ar: p => ({ title: 'تمت إضافتك إلى مناسبة', body: `${p.client} — ${fmtDate(p.date, 'ar')}${p.role ? ` · الدور: ${ROLE_LABELS.ar[p.role] || p.role}` : ''}` }),
  },
  event_updated: {
    en: p => ({ title: 'Event details changed', body: `${p.client} — ${fmtDate(p.date, 'en')} · changed: ${(p.changes || []).map((c: string) => CHANGE_LABELS.en[c] || c).join(', ')}${p.guestCount ? ` (${p.guestCount} guests)` : ''}` }),
    fr: p => ({ title: 'Détails de l\'événement modifiés', body: `${p.client} — ${fmtDate(p.date, 'fr')} · modifié : ${(p.changes || []).map((c: string) => CHANGE_LABELS.fr[c] || c).join(', ')}${p.guestCount ? ` (${p.guestCount} invités)` : ''}` }),
    ar: p => ({ title: 'تم تغيير تفاصيل المناسبة', body: `${p.client} — ${fmtDate(p.date, 'ar')} · تم تغيير: ${(p.changes || []).map((c: string) => CHANGE_LABELS.ar[c] || c).join('، ')}${p.guestCount ? ` (${p.guestCount} ضيف)` : ''}` }),
  },
  event_status: {
    en: p => ({ title: `Event status: ${p.status}`, body: `${p.client} — ${fmtDate(p.date, 'en')}` }),
    fr: p => ({ title: `Statut de l'événement : ${p.status}`, body: `${p.client} — ${fmtDate(p.date, 'fr')}` }),
    ar: p => ({ title: `حالة المناسبة: ${p.status}`, body: `${p.client} — ${fmtDate(p.date, 'ar')}` }),
  },
  event_soon: {
    en: p => ({ title: p.hours <= 24 ? 'Event tomorrow' : 'Event in 2 days', body: `${p.client} — ${fmtDate(p.date, 'en')}${p.startTime ? ` at ${p.startTime}` : ''}${p.guestCount ? ` · ${p.guestCount} guests` : ''}` }),
    fr: p => ({ title: p.hours <= 24 ? 'Événement demain' : 'Événement dans 2 jours', body: `${p.client} — ${fmtDate(p.date, 'fr')}${p.startTime ? ` à ${p.startTime}` : ''}${p.guestCount ? ` · ${p.guestCount} invités` : ''}` }),
    ar: p => ({ title: p.hours <= 24 ? 'مناسبة غدًا' : 'مناسبة بعد يومين', body: `${p.client} — ${fmtDate(p.date, 'ar')}${p.startTime ? ` على الساعة ${p.startTime}` : ''}${p.guestCount ? ` · ${p.guestCount} ضيف` : ''}` }),
  },
  materials_incomplete: {
    en: p => ({ title: 'Materials not ready', body: `${p.client} — ${fmtDate(p.date, 'en')} · ${p.remaining} item(s) not checked${p.missing ? `, ${p.missing} missing` : ''}` }),
    fr: p => ({ title: 'Matériel pas prêt', body: `${p.client} — ${fmtDate(p.date, 'fr')} · ${p.remaining} article(s) non coché(s)${p.missing ? `, ${p.missing} manquant(s)` : ''}` }),
    ar: p => ({ title: 'المعدات غير جاهزة', body: `${p.client} — ${fmtDate(p.date, 'ar')} · ${p.remaining} صنف لم يُتحقق منه${p.missing ? `، ${p.missing} مفقود` : ''}` }),
  },

  // ── Tasks ──
  task_assigned: {
    en: p => ({ title: 'New task assigned to you', body: `${TASK_LABELS.en[p.taskType] || 'Task'} — ${fmtDate(p.date, 'en')}${p.notes ? ` · ${p.notes}` : ''}` }),
    fr: p => ({ title: 'Nouvelle tâche pour vous', body: `${TASK_LABELS.fr[p.taskType] || 'Tâche'} — ${fmtDate(p.date, 'fr')}${p.notes ? ` · ${p.notes}` : ''}` }),
    ar: p => ({ title: 'مهمة جديدة مسندة إليك', body: `${TASK_LABELS.ar[p.taskType] || 'مهمة'} — ${fmtDate(p.date, 'ar')}${p.notes ? ` · ${p.notes}` : ''}` }),
  },
  task_due: {
    en: p => ({ title: 'Task due today', body: `${TASK_LABELS.en[p.taskType] || 'Task'}${p.notes ? ` · ${p.notes}` : ''}` }),
    fr: p => ({ title: 'Tâche prévue aujourd\'hui', body: `${TASK_LABELS.fr[p.taskType] || 'Tâche'}${p.notes ? ` · ${p.notes}` : ''}` }),
    ar: p => ({ title: 'مهمة مستحقة اليوم', body: `${TASK_LABELS.ar[p.taskType] || 'مهمة'}${p.notes ? ` · ${p.notes}` : ''}` }),
  },
  task_overdue: {
    en: p => ({ title: 'Task overdue', body: `${TASK_LABELS.en[p.taskType] || 'Task'} — was due ${fmtDate(p.date, 'en')}${p.notes ? ` · ${p.notes}` : ''}` }),
    fr: p => ({ title: 'Tâche en retard', body: `${TASK_LABELS.fr[p.taskType] || 'Tâche'} — prévue le ${fmtDate(p.date, 'fr')}${p.notes ? ` · ${p.notes}` : ''}` }),
    ar: p => ({ title: 'مهمة متأخرة', body: `${TASK_LABELS.ar[p.taskType] || 'مهمة'} — كانت مستحقة في ${fmtDate(p.date, 'ar')}${p.notes ? ` · ${p.notes}` : ''}` }),
  },

  // ── Sales & payments ──
  payment_received: {
    en: p => ({ title: 'Payment received', body: `${money(p)} — ${p.client}` }),
    fr: p => ({ title: 'Paiement reçu', body: `${money(p)} — ${p.client}` }),
    ar: p => ({ title: 'تم استلام دفعة', body: `${money(p)} — ${p.client}` }),
  },
  invoice_issued: {
    en: p => ({ title: `Invoice ${p.number} issued`, body: `${p.client} — ${money(p)}` }),
    fr: p => ({ title: `Facture ${p.number} émise`, body: `${p.client} — ${money(p)}` }),
    ar: p => ({ title: `تم إصدار الفاتورة ${p.number}`, body: `${p.client} — ${money(p)}` }),
  },
  credit_note_issued: {
    en: p => ({ title: `Credit note ${p.number} issued`, body: `${p.client} — ${money(p)}` }),
    fr: p => ({ title: `Avoir ${p.number} émis`, body: `${p.client} — ${money(p)}` }),
    ar: p => ({ title: `تم إصدار الإشعار الدائن ${p.number}`, body: `${p.client} — ${money(p)}` }),
  },
  deposit_overdue: {
    en: p => ({ title: 'No deposit yet', body: `${p.client} — event on ${fmtDate(p.date, 'en')} and nothing has been paid` }),
    fr: p => ({ title: 'Aucun acompte reçu', body: `${p.client} — événement le ${fmtDate(p.date, 'fr')} et rien n'a été payé` }),
    ar: p => ({ title: 'لم يُستلم أي عربون بعد', body: `${p.client} — مناسبة في ${fmtDate(p.date, 'ar')} ولم يُدفع أي شيء` }),
  },
  balance_unpaid: {
    en: p => ({ title: 'Balance still unpaid', body: `${p.client} — event was on ${fmtDate(p.date, 'en')}${p.amount != null ? ` · ${money(p)} due` : ''}` }),
    fr: p => ({ title: 'Solde toujours impayé', body: `${p.client} — événement du ${fmtDate(p.date, 'fr')}${p.amount != null ? ` · ${money(p)} dû` : ''}` }),
    ar: p => ({ title: 'الرصيد لا يزال غير مدفوع', body: `${p.client} — كانت المناسبة في ${fmtDate(p.date, 'ar')}${p.amount != null ? ` · ${money(p)} مستحق` : ''}` }),
  },
  quote_stale: {
    en: p => ({ title: 'Quote waiting for an answer', body: `${p.client} — quote sent ${p.days} days ago, order still "${p.status}"` }),
    fr: p => ({ title: 'Devis sans réponse', body: `${p.client} — devis envoyé il y a ${p.days} jours, commande toujours « ${p.status} »` }),
    ar: p => ({ title: 'عرض سعر في انتظار الرد', body: `${p.client} — أُرسل عرض السعر منذ ${p.days} أيام، والطلب لا يزال "${p.status}"` }),
  },

  // ── Stock & laundry ──
  kitchen_low: {
    en: p => ({ title: 'Kitchen stock low', body: `${p.item}: ${p.qty}${p.unit ? ` ${p.unit}` : ''} left (minimum ${p.min})` }),
    fr: p => ({ title: 'Stock cuisine bas', body: `${p.item} : il reste ${p.qty}${p.unit ? ` ${p.unit}` : ''} (minimum ${p.min})` }),
    ar: p => ({ title: 'مخزون المطبخ منخفض', body: `${p.item}: تبقى ${p.qty}${p.unit ? ` ${p.unit}` : ''} (الحد الأدنى ${p.min})` }),
  },
  inventory_low: {
    en: p => ({ title: 'Inventory low', body: `${p.item}: ${p.qty} left (minimum ${p.min})` }),
    fr: p => ({ title: 'Inventaire bas', body: `${p.item} : il reste ${p.qty} (minimum ${p.min})` }),
    ar: p => ({ title: 'المخزون منخفض', body: `${p.item}: تبقى ${p.qty} (الحد الأدنى ${p.min})` }),
  },
  laundry_losses: {
    en: p => ({ title: 'Laundry returned with losses', body: `${p.batch}: ${p.lost || 0} lost, ${p.damaged || 0} damaged` }),
    fr: p => ({ title: 'Blanchisserie : pertes au retour', body: `${p.batch} : ${p.lost || 0} perdu(s), ${p.damaged || 0} abîmé(s)` }),
    ar: p => ({ title: 'عاد الغسيل مع خسائر', body: `${p.batch}: ${p.lost || 0} مفقود، ${p.damaged || 0} تالف` }),
  },
  laundry_overdue: {
    en: p => ({ title: 'Laundry not back yet', body: `${p.batch} — sent ${p.days} days ago` }),
    fr: p => ({ title: 'Blanchisserie pas encore revenue', body: `${p.batch} — envoyé il y a ${p.days} jours` }),
    ar: p => ({ title: 'لم يعد الغسيل بعد', body: `${p.batch} — أُرسل منذ ${p.days} أيام` }),
  },

  // ── Account ──
  license_expiring: {
    en: p => ({ title: `Subscription ends in ${p.days} day(s)`, body: `Your access ends on ${fmtDate(p.date, 'en')}. Contact us to renew.` }),
    fr: p => ({ title: `Abonnement : fin dans ${p.days} jour(s)`, body: `Votre accès se termine le ${fmtDate(p.date, 'fr')}. Contactez-nous pour le renouveler.` }),
    ar: p => ({ title: `ينتهي الاشتراك خلال ${p.days} يوم`, body: `ينتهي وصولك في ${fmtDate(p.date, 'ar')}. تواصل معنا للتجديد.` }),
  },
};

export function renderNotification(type: string, params: Params, lang: Lang = 'en'): { title: string; body: string } {
  const r = R[type]?.[lang] || R[type]?.en;
  if (!r) return { title: type, body: '' };
  try {
    return r(params || {}, lang);
  } catch {
    return { title: type, body: '' };
  }
}
