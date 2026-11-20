// @ts-nocheck
// Tenant contracts: built-in templates, placeholder filling and a small, safe
// text-to-HTML renderer. No DB access, so client components can import it
// (the settings loader lives in lib/platformSettings.ts).
import { MODULE_REGISTRY } from '@/lib/modules';

export type ContractLang = 'fr' | 'en' | 'ar';
export const CONTRACT_LANGS: ContractLang[] = ['fr', 'en', 'ar'];
export const CONTRACT_LANG_LABELS: Record<ContractLang, string> = { fr: 'Français', en: 'English', ar: 'العربية' };

export const ISSUER_FIELDS = [
  ['name', 'Trade name'], ['legalName', 'Legal name'], ['legalForm', 'Legal form (SARL, SA…)'],
  ['shareCapital', 'Share capital'], ['ice', 'ICE'], ['identifiantFiscal', 'Identifiant fiscal (IF)'],
  ['rcNumber', 'RC number'], ['rcCourt', 'RC court (city)'], ['taxeProfessionnelle', 'Taxe professionnelle'],
  ['address', 'Address'], ['city', 'City'], ['email', 'Email'], ['phone', 'Phone'],
  ['representativeName', 'Legal representative'], ['representativeTitle', 'Representative title'],
] as const;

export const TENANT_LEGAL_FIELDS = [
  ['legalName', 'Legal name'], ['legalForm', 'Legal form'], ['ice', 'ICE'],
  ['identifiantFiscal', 'Identifiant fiscal (IF)'], ['rcNumber', 'RC number'], ['rcCourt', 'RC court (city)'],
  ['address', 'Address'], ['city', 'City'],
  ['representativeName', 'Legal representative'], ['representativeTitle', 'Representative title'],
] as const;

/** Placeholders available in templates, with what they stand for. */
export const PLACEHOLDERS: [string, string][] = [
  ['contract.number', 'Contract number (assigned when finalized)'],
  ['contract.date', 'Contract date (finalization date)'],
  ['issuer.legalName', 'Your legal name'], ['issuer.name', 'Your trade name'],
  ['issuer.legalForm', 'Your legal form'], ['issuer.shareCapital', 'Your share capital'],
  ['issuer.ice', 'Your ICE'], ['issuer.identifiantFiscal', 'Your IF'], ['issuer.rcNumber', 'Your RC'],
  ['issuer.rcCourt', 'Your RC court'], ['issuer.address', 'Your address'], ['issuer.city', 'Your city'],
  ['issuer.email', 'Your email'], ['issuer.phone', 'Your phone'],
  ['issuer.representative', 'Your representative (name, title)'],
  ['tenant.name', 'Customer trade name'], ['tenant.legalName', 'Customer legal name'],
  ['tenant.legalForm', 'Customer legal form'], ['tenant.ice', 'Customer ICE'],
  ['tenant.identifiantFiscal', 'Customer IF'], ['tenant.rcNumber', 'Customer RC'],
  ['tenant.rcCourt', 'Customer RC court'], ['tenant.address', 'Customer address'], ['tenant.city', 'Customer city'],
  ['tenant.representative', 'Customer representative (name, title)'],
  ['tenant.email', 'Customer contact email'], ['tenant.phone', 'Customer contact phone'],
  ['plan.name', 'Plan name'], ['plan.price', 'Plan price with currency'], ['plan.period', 'Billing period'],
  ['plan.modules', 'Included optional modules'], ['plan.maxUsers', 'User limit'],
  ['license.startsAt', 'Subscription start date'], ['license.expiresAt', 'Subscription end date'],
];

/** Placeholders that must have a value before a contract can be finalized. */
export const REQUIRED_PLACEHOLDERS = [
  'issuer.legalName', 'issuer.ice', 'issuer.address', 'issuer.representative',
  'tenant.legalName', 'tenant.ice', 'tenant.address', 'tenant.representative',
];

// ── Built-in templates ───────────────────────────────────────────────────────
// Markup: "# " title, "## " heading, "- " list item, **bold**, blank line = new paragraph.

const FR = `# CONTRAT D'ABONNEMENT À UN SERVICE LOGICIEL (SaaS)

Contrat n° **{{contract.number}}** du {{contract.date}}

## Entre les soussignés

**{{issuer.legalName}}**, {{issuer.legalForm}} au capital de {{issuer.shareCapital}}, dont le siège social est situé {{issuer.address}}, {{issuer.city}}, immatriculée au Registre de Commerce de {{issuer.rcCourt}} sous le n° {{issuer.rcNumber}}, ICE {{issuer.ice}}, IF {{issuer.identifiantFiscal}}, représentée par {{issuer.representative}}, dûment habilité(e),

ci-après dénommée « **le Prestataire** »,

## Et

**{{tenant.legalName}}**, {{tenant.legalForm}}, dont le siège social est situé {{tenant.address}}, {{tenant.city}}, immatriculée au Registre de Commerce de {{tenant.rcCourt}} sous le n° {{tenant.rcNumber}}, ICE {{tenant.ice}}, IF {{tenant.identifiantFiscal}}, représentée par {{tenant.representative}}, dûment habilité(e),

ci-après dénommée « **le Client** ».

## Article 1 – Objet

Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire met à la disposition du Client, en mode SaaS (logiciel hébergé accessible par internet), sa solution de gestion de traiteur (commandes, devis, factures, calendrier et modules associés).

## Article 2 – Offre souscrite

Le Client souscrit à l'offre **{{plan.name}}**, comprenant :

- Nombre maximum d'utilisateurs : {{plan.maxUsers}}
- Modules optionnels inclus : {{plan.modules}}

## Article 3 – Durée

Le contrat prend effet le {{license.startsAt}} pour une période se terminant le {{license.expiresAt}}. Il est renouvelable par le paiement de la période suivante. L'accès au service n'est ouvert qu'après signature du présent contrat par les deux parties.

## Article 4 – Prix et modalités de paiement

L'abonnement est facturé {{plan.price}} ({{plan.period}}), hors taxes, payable d'avance. Tout retard de paiement peut entraîner la suspension de l'accès au service après notification restée sans effet.

## Article 5 – Obligations du Prestataire

Le Prestataire s'engage à fournir un accès au service dans le cadre d'une obligation de moyens, à assurer la maintenance, la sécurité et la sauvegarde régulière des données, et à informer le Client de toute interruption programmée.

## Article 6 – Obligations du Client

Le Client s'engage à utiliser le service conformément à sa destination, à préserver la confidentialité de ses identifiants, et à s'acquitter du prix dans les délais convenus. Il demeure seul responsable des données qu'il saisit.

## Article 7 – Données personnelles

Chaque partie s'engage à respecter la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel. Le Prestataire agit en qualité de sous-traitant pour le compte du Client et ne traite les données que pour l'exécution du service.

## Article 8 – Propriété intellectuelle

Le Prestataire demeure seul titulaire des droits sur la solution. Le Client conserve la propriété de ses données et peut en obtenir l'export à tout moment pendant la durée du contrat.

## Article 9 – Responsabilité

La responsabilité du Prestataire est limitée aux dommages directs et ne saurait excéder le montant payé par le Client au titre des douze (12) derniers mois.

## Article 10 – Résiliation

Chaque partie peut résilier le contrat en cas de manquement grave de l'autre partie, non réparé dans un délai de trente (30) jours suivant une mise en demeure. À l'échéance, le Client peut ne pas renouveler sans frais.

## Article 11 – Droit applicable et juridiction

Le présent contrat est soumis au droit marocain. Tout litige relatif à son interprétation ou à son exécution relève de la compétence exclusive du Tribunal de Commerce de {{issuer.city}}.

Fait à {{issuer.city}}, le {{contract.date}}, en deux exemplaires originaux.
`;

const EN = `# SOFTWARE-AS-A-SERVICE SUBSCRIPTION AGREEMENT

Agreement no. **{{contract.number}}** dated {{contract.date}}

## Between

**{{issuer.legalName}}**, a {{issuer.legalForm}} with a share capital of {{issuer.shareCapital}}, having its registered office at {{issuer.address}}, {{issuer.city}}, registered with the Trade Register of {{issuer.rcCourt}} under no. {{issuer.rcNumber}}, ICE {{issuer.ice}}, IF {{issuer.identifiantFiscal}}, represented by {{issuer.representative}}, duly authorised,

hereinafter "**the Provider**",

## And

**{{tenant.legalName}}**, a {{tenant.legalForm}}, having its registered office at {{tenant.address}}, {{tenant.city}}, registered with the Trade Register of {{tenant.rcCourt}} under no. {{tenant.rcNumber}}, ICE {{tenant.ice}}, IF {{tenant.identifiantFiscal}}, represented by {{tenant.representative}}, duly authorised,

hereinafter "**the Customer**".

## Article 1 – Purpose

This agreement sets out the terms under which the Provider makes its catering management software (orders, quotes, invoices, calendar and related modules) available to the Customer as a hosted service accessed over the internet (SaaS).

## Article 2 – Subscribed plan

The Customer subscribes to the **{{plan.name}}** plan, including:

- Maximum number of users: {{plan.maxUsers}}
- Optional modules included: {{plan.modules}}

## Article 3 – Term

This agreement takes effect on {{license.startsAt}} for a period ending on {{license.expiresAt}}. It is renewed by payment of the following period. Access to the service is only opened once this agreement has been signed by both parties.

## Article 4 – Price and payment

The subscription is charged {{plan.price}} ({{plan.period}}), excluding taxes, payable in advance. Late payment may lead to suspension of access after a notice that remains unanswered.

## Article 5 – Provider's obligations

The Provider shall use reasonable efforts to provide access to the service, perform maintenance, keep data secure and backed up regularly, and inform the Customer of any scheduled interruption.

## Article 6 – Customer's obligations

The Customer shall use the service for its intended purpose, keep its credentials confidential and pay the price on time. The Customer remains solely responsible for the data it enters.

## Article 7 – Personal data

Each party shall comply with Moroccan Law no. 09-08 on the protection of individuals with regard to the processing of personal data. The Provider acts as a processor on behalf of the Customer and processes data only to deliver the service.

## Article 8 – Intellectual property

The Provider retains all rights in the software. The Customer retains ownership of its data and may export it at any time during the term.

## Article 9 – Liability

The Provider's liability is limited to direct damages and shall not exceed the amounts paid by the Customer over the previous twelve (12) months.

## Article 10 – Termination

Either party may terminate this agreement for a material breach by the other party that is not remedied within thirty (30) days of formal notice. At the end of a period the Customer may decline renewal at no cost.

## Article 11 – Governing law and jurisdiction

This agreement is governed by Moroccan law. Any dispute regarding its interpretation or performance falls under the exclusive jurisdiction of the Commercial Court of {{issuer.city}}.

Signed in {{issuer.city}} on {{contract.date}}, in two original copies.
`;

const AR = `# عقد اشتراك في خدمة برمجية (SaaS)

عقد رقم **{{contract.number}}** بتاريخ {{contract.date}}

## بين الموقعين أدناه

**{{issuer.legalName}}**، {{issuer.legalForm}} برأسمال قدره {{issuer.shareCapital}}، الكائن مقرها الاجتماعي بـ {{issuer.address}}، {{issuer.city}}، المسجلة بالسجل التجاري بـ {{issuer.rcCourt}} تحت رقم {{issuer.rcNumber}}، التعريف الموحد للمقاولة (ICE) {{issuer.ice}}، التعريف الضريبي {{issuer.identifiantFiscal}}، يمثلها {{issuer.representative}}، بصفته المخول قانونيا،

المشار إليها فيما يلي بـ « **مقدم الخدمة** »،

## و

**{{tenant.legalName}}**، {{tenant.legalForm}}، الكائن مقرها الاجتماعي بـ {{tenant.address}}، {{tenant.city}}، المسجلة بالسجل التجاري بـ {{tenant.rcCourt}} تحت رقم {{tenant.rcNumber}}، التعريف الموحد للمقاولة (ICE) {{tenant.ice}}، التعريف الضريبي {{tenant.identifiantFiscal}}، يمثلها {{tenant.representative}}، بصفته المخول قانونيا،

المشار إليها فيما يلي بـ « **الزبون** ».

## المادة 1 – موضوع العقد

يحدد هذا العقد الشروط التي يضع بموجبها مقدم الخدمة رهن إشارة الزبون حله البرمجي لتدبير خدمات الممون (الطلبات، عروض الأسعار، الفواتير، التقويم والوحدات المرتبطة بها) في شكل خدمة مستضافة عبر الإنترنت.

## المادة 2 – العرض المشترك فيه

يشترك الزبون في عرض **{{plan.name}}** الذي يشمل:

- الحد الأقصى لعدد المستخدمين: {{plan.maxUsers}}
- الوحدات الاختيارية المشمولة: {{plan.modules}}

## المادة 3 – المدة

يسري هذا العقد ابتداء من {{license.startsAt}} إلى غاية {{license.expiresAt}}، ويتجدد بأداء مبلغ الفترة الموالية. لا يتم فتح الولوج إلى الخدمة إلا بعد توقيع هذا العقد من طرف الطرفين.

## المادة 4 – الثمن وطريقة الأداء

يحدد مبلغ الاشتراك في {{plan.price}} ({{plan.period}}) دون احتساب الرسوم، ويؤدى مسبقا. ويمكن أن يؤدي التأخر في الأداء إلى تعليق الولوج إلى الخدمة بعد إشعار يظل دون جدوى.

## المادة 5 – التزامات مقدم الخدمة

يلتزم مقدم الخدمة ببذل العناية اللازمة لتوفير الولوج إلى الخدمة، وضمان صيانتها وأمن المعطيات وحفظها بشكل منتظم، وإخبار الزبون بكل انقطاع مبرمج.

## المادة 6 – التزامات الزبون

يلتزم الزبون باستعمال الخدمة وفق الغرض المخصص لها، والحفاظ على سرية معرفات الدخول، وأداء الثمن في الآجال المتفق عليها. ويبقى وحده مسؤولا عن المعطيات التي يدخلها.

## المادة 7 – المعطيات الشخصية

يلتزم كل طرف باحترام القانون رقم 09-08 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي. ويعمل مقدم الخدمة بصفته معالجا لحساب الزبون ولا يعالج المعطيات إلا لتنفيذ الخدمة.

## المادة 8 – الملكية الفكرية

يحتفظ مقدم الخدمة وحده بجميع الحقوق على الحل البرمجي. ويحتفظ الزبون بملكية معطياته ويمكنه الحصول على نسخة منها في أي وقت طيلة مدة العقد.

## المادة 9 – المسؤولية

تقتصر مسؤولية مقدم الخدمة على الأضرار المباشرة، ولا يمكن أن تتجاوز المبالغ التي أداها الزبون خلال الاثني عشر (12) شهرا الأخيرة.

## المادة 10 – الفسخ

يجوز لكل طرف فسخ العقد في حالة إخلال جسيم من الطرف الآخر لم يتم تداركه داخل أجل ثلاثين (30) يوما من تاريخ الإنذار. وعند انتهاء المدة، يمكن للزبون عدم التجديد دون أي تكاليف.

## المادة 11 – القانون الواجب التطبيق والاختصاص القضائي

يخضع هذا العقد للقانون المغربي. ويعود الاختصاص في كل نزاع يتعلق بتفسيره أو تنفيذه حصريا إلى المحكمة التجارية بـ {{issuer.city}}.

حرر بـ {{issuer.city}} بتاريخ {{contract.date}} في نظيرين أصليين.
`;

export const DEFAULT_TEMPLATES: Record<ContractLang, string> = { fr: FR, en: EN, ar: AR };

// Labels used on the printed page (signature block, header).
export const PRINT_LABELS: Record<ContractLang, Record<string, string>> = {
  fr: { provider: 'Pour le Prestataire', customer: 'Pour le Client', name: 'Nom', title: 'Qualité', date: 'Date', signature: 'Signature et cachet', approved: '« Lu et approuvé »', draft: 'PROJET', page: 'Page', contract: 'Contrat' },
  en: { provider: 'For the Provider', customer: 'For the Customer', name: 'Name', title: 'Title', date: 'Date', signature: 'Signature and stamp', approved: '"Read and approved"', draft: 'DRAFT', page: 'Page', contract: 'Agreement' },
  ar: { provider: 'عن مقدم الخدمة', customer: 'عن الزبون', name: 'الاسم', title: 'الصفة', date: 'التاريخ', signature: 'التوقيع والختم', approved: '« قرئ وصودق عليه »', draft: 'مسودة', page: 'صفحة', contract: 'عقد' },
};

const LOCALES: Record<ContractLang, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const PERIODS: Record<ContractLang, Record<string, string>> = {
  fr: { monthly: 'par mois', yearly: 'par an' },
  en: { monthly: 'per month', yearly: 'per year' },
  ar: { monthly: 'شهريا', yearly: 'سنويا' },
};
const UNLIMITED: Record<ContractLang, string> = { fr: 'illimité', en: 'unlimited', ar: 'غير محدود' };
const NONE: Record<ContractLang, string> = { fr: 'aucun', en: 'none', ar: 'لا شيء' };

function fmtDate(d, lang: ContractLang) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  // Latin digits in every language (standard on Moroccan legal documents).
  return date.toLocaleDateString(LOCALES[lang], { day: '2-digit', month: 'long', year: 'numeric', numberingSystem: 'latn' });
}

function fmtMoney(n, currency, lang: ContractLang) {
  const v = Number(n) || 0;
  const s = v.toLocaleString(LOCALES[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2, numberingSystem: 'latn' });
  return `${s} ${currency || 'MAD'}`;
}

const rep = (name?: string, title?: string) => [name, title].filter(Boolean).join(', ');

/**
 * Flat map of placeholder → display string, built from live records. Frozen
 * into the contract (snapshot.values) when it is issued.
 */
export function buildValues({ tenant, plan, issuer, contract }, lang: ContractLang): Record<string, string> {
  const l = tenant?.legal ?? {};
  const allOptional = MODULE_REGISTRY.filter(m => !m.builtIn);
  const moduleIds = tenant?.overrides?.modules ?? plan?.modules ?? allOptional.map(m => m.id);
  const nameKey = lang === 'fr' ? 'nameFr' : lang === 'ar' ? 'nameAr' : 'name';
  const moduleNames = moduleIds
    .map(id => MODULE_REGISTRY.find(m => m.id === id))
    .filter(m => m && !m.builtIn)
    .map(m => m[nameKey] || m.name);
  const maxUsers = tenant?.overrides?.maxUsers ?? plan?.maxUsers ?? 0;
  const i = issuer ?? {};

  const v: Record<string, string> = {
    'contract.number': contract?.number || '',
    'contract.date': fmtDate(contract?.issuedAt ?? new Date(), lang),
    'issuer.representative': rep(i.representativeName, i.representativeTitle),
    'tenant.name': tenant?.name || '',
    'tenant.email': tenant?.contactEmail || '',
    'tenant.phone': tenant?.contactPhone || '',
    'tenant.representative': rep(l.representativeName, l.representativeTitle),
    'plan.name': plan?.name || '',
    'plan.price': plan ? fmtMoney(plan.price, plan.currency, lang) : '',
    'plan.period': plan ? PERIODS[lang][plan.billingPeriod] ?? plan.billingPeriod : '',
    'plan.modules': moduleNames.length ? moduleNames.join(', ') : NONE[lang],
    'plan.maxUsers': maxUsers ? String(maxUsers) : UNLIMITED[lang],
    'license.startsAt': fmtDate(tenant?.license?.startsAt, lang),
    'license.expiresAt': fmtDate(tenant?.license?.expiresAt, lang),
  };
  for (const [k] of ISSUER_FIELDS) v[`issuer.${k}`] = i[k] || '';
  for (const [k] of TENANT_LEGAL_FIELDS) v[`tenant.${k}`] = l[k] || '';
  // A customer without a separate legal name contracts under its trade name.
  if (!v['tenant.legalName']) v['tenant.legalName'] = tenant?.name || '';
  if (!v['issuer.legalName']) v['issuer.legalName'] = i.name || '';
  return v;
}

const PH = /\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}/g;

/** Replaces {{placeholders}}; empty values become a visible blank line to fill by hand. */
export function fillPlaceholders(body: string, values: Record<string, string>): string {
  return String(body ?? '').replace(PH, (m, key) => (key in values ? (values[key] || '__________') : m));
}

/** Required placeholders used in the body that have no value. */
export function missingValues(body: string, values: Record<string, string>): string[] {
  const used = new Set([...String(body ?? '').matchAll(PH)].map(m => m[1]));
  return REQUIRED_PLACEHOLDERS.filter(k => used.has(k) && !values[k]);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const inline = (s: string) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

/**
 * Converts the contract markup to HTML. Everything is escaped first, so the
 * output only ever contains the tags generated here.
 */
export function renderContractText(text: string): string {
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br/>')}</p>`); para = []; } };
  const flushList = () => { if (list.length) { out.push(`<ul>${list.map(li => `<li>${inline(li)}</li>`).join('')}</ul>`); list = []; } };
  for (const raw of String(text ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (line.startsWith('# ')) { flushPara(); flushList(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    if (line.startsWith('## ')) { flushPara(); flushList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (/^\s*[-*] /.test(line)) { flushPara(); list.push(line.replace(/^\s*[-*] /, '')); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return out.join('\n');
}
