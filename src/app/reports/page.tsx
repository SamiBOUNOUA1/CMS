'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { useIsMobile } from '@/lib/useIsMobile';

function formatCurrency(n: number | null | undefined, cur = '€') {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ' + cur;
}

interface ReportData {
  range: string;
  kpis: { totalRevenue: number; orderCount: number; avgOrderValue: number; conversionPct: number; guestsServed: number };
  paymentsSummary: { collected: number; outstanding: number };
  revenueByMonth: { key: string; label: string; revenue: number }[];
  bookingsByEventType: { key: string; label: string; count: number; revenue: number }[];
  statusFunnel: { name: string; label: string; color: string; count: number }[];
  topProducts: { name: string; count: number }[];
  alerts: { lowStockCount: number; overdueUnpaidCount: number };
}

const RANGES = ['30d', '90d', '12m'] as const;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-g-surface border border-g-border rounded-2xl shadow-google-1 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-sans text-[15px] font-medium text-g-text m-0 mb-4">{children}</h2>;
}

export default function ReportsPage() {
  const t = useT();
  const tr = t.reportsPage;
  const currency = useCurrency();
  const isMobile = useIsMobile();

  const [range, setRange] = useState<string>('12m');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?range=${range}`);
      if (res.status === 403) { setForbidden(true); setLoading(false); return; }
      if (!res.ok) { setLoading(false); return; }
      const d = await res.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (forbidden) {
    return (
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-8">
        <p className="text-g-text-2 text-sm">{tr.forbidden}</p>
      </div>
    );
  }

  const maxRevenue = data ? Math.max(1, ...data.revenueByMonth.map(m => m.revenue)) : 1;
  const maxStatus = data ? Math.max(1, ...data.statusFunnel.map(s => s.count)) : 1;
  const maxType = data ? Math.max(1, ...data.bookingsByEventType.map(b => b.count)) : 1;
  const maxProduct = data ? Math.max(1, ...data.topProducts.map(p => p.count)) : 1;

  const kpiCards = data ? [
    { label: tr.kpi.revenue, value: formatCurrency(data.kpis.totalRevenue, currency), color: '#1a73e8' },
    { label: tr.kpi.orders, value: String(data.kpis.orderCount), color: '#9334e6' },
    { label: tr.kpi.avgValue, value: formatCurrency(data.kpis.avgOrderValue, currency), color: '#137333' },
    { label: tr.kpi.conversion, value: `${data.kpis.conversionPct}%`, color: '#e37400' },
    { label: tr.kpi.guests, value: String(data.kpis.guestsServed), color: '#00838f' },
  ] : [];

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-8">
      {/* Header + range selector */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="font-sans text-[22px] font-normal text-g-text m-0">{tr.title}</h1>
        <div className="flex rounded-full border border-g-border overflow-hidden flex-shrink-0">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="py-1.5 px-3.5 border-none cursor-pointer text-[13px] font-sans font-medium transition-[background,color] duration-150"
              style={{
                background: range === r ? '#1a73e8' : 'transparent',
                color: range === r ? '#fff' : 'var(--google-text-secondary)',
              }}
            >
              {tr.ranges[r]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[88px] bg-g-surface border border-g-border rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {kpiCards.map(k => (
              <Card key={k.label} className="p-4">
                <p className="m-0 text-xs text-g-text-2 font-medium">{k.label}</p>
                <p className="m-0 mt-1.5 font-sans text-[20px] font-medium" style={{ color: k.color }}>{k.value}</p>
              </Card>
            ))}
          </div>

          {/* Payments summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <Card className="p-4">
              <p className="m-0 text-xs text-g-text-2 font-medium">{tr.collected}</p>
              <p className="m-0 mt-1.5 font-sans text-[20px] font-medium text-google-green">{formatCurrency(data.paymentsSummary.collected, currency)}</p>
            </Card>
            <Card className="p-4">
              <p className="m-0 text-xs text-g-text-2 font-medium">{tr.outstanding}</p>
              <p className="m-0 mt-1.5 font-sans text-[20px] font-medium text-google-red">{formatCurrency(data.paymentsSummary.outstanding, currency)}</p>
            </Card>
          </div>

          {/* Revenue by month */}
          <Card className="p-5 mb-6">
            <SectionTitle>{tr.revenueByMonth}</SectionTitle>
            {data.revenueByMonth.every(m => m.revenue === 0) ? (
              <p className="text-g-text-3 text-sm m-0">{tr.empty}</p>
            ) : isMobile ? (
              /* Mobile: horizontal bars with always-visible values */
              <div className="space-y-2.5">
                {data.revenueByMonth.filter(m => m.revenue > 0).map(m => (
                  <div key={m.key} className="flex items-center gap-2.5">
                    <span className="text-[11px] text-g-text-2 w-8 flex-shrink-0">{m.label}</span>
                    <div className="flex-1 h-4 rounded-full bg-g-bg overflow-hidden">
                      <div className="h-full rounded-full bg-google-blue" style={{ width: `${(m.revenue / maxRevenue) * 100}%`, minWidth: 4 }} />
                    </div>
                    <span className="text-[11px] text-g-text font-medium w-[68px] text-right flex-shrink-0">{formatCurrency(m.revenue, currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop: vertical bars, value on hover */
              <div className="flex items-end gap-1.5 h-[180px]">
                {data.revenueByMonth.map(m => (
                  <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full group">
                    <span className="text-[10px] text-g-text-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatCurrency(m.revenue, currency)}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-google-blue transition-all"
                      style={{ height: `${(m.revenue / maxRevenue) * 100}%`, minHeight: m.revenue > 0 ? 3 : 0 }}
                      title={formatCurrency(m.revenue, currency)}
                    />
                    <span className="text-[10px] text-g-text-2">{m.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Status funnel */}
            <Card className="p-5">
              <SectionTitle>{tr.statusFunnel}</SectionTitle>
              {data.statusFunnel.length === 0 ? (
                <p className="text-g-text-3 text-sm m-0">{tr.empty}</p>
              ) : (
                <div className="space-y-2.5">
                  {data.statusFunnel.map(s => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-g-text font-medium">{s.label}</span>
                        <span className="text-g-text-2">{s.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-g-bg overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(s.count / maxStatus) * 100}%`, background: s.color || '#5f6368' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Bookings by event type */}
            <Card className="p-5">
              <SectionTitle>{tr.byEventType}</SectionTitle>
              {data.bookingsByEventType.length === 0 ? (
                <p className="text-g-text-3 text-sm m-0">{tr.empty}</p>
              ) : (
                <div className="space-y-2.5">
                  {data.bookingsByEventType.map(b => (
                    <div key={b.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-g-text font-medium">{b.label}</span>
                        <span className="text-g-text-2">{b.count} · {formatCurrency(b.revenue, currency)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-g-bg overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(b.count / maxType) * 100}%`, background: '#9334e6' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top products */}
            <Card className="p-5">
              <SectionTitle>{tr.topProducts}</SectionTitle>
              {data.topProducts.length === 0 ? (
                <p className="text-g-text-3 text-sm m-0">{tr.empty}</p>
              ) : (
                <div className="space-y-2.5">
                  {data.topProducts.map(p => (
                    <div key={p.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-g-text font-medium truncate pr-2">{p.name}</span>
                        <span className="text-g-text-2 flex-shrink-0">{p.count}×</span>
                      </div>
                      <div className="h-2 rounded-full bg-g-bg overflow-hidden">
                        <div className="h-full rounded-full bg-google-green" style={{ width: `${(p.count / maxProduct) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Alerts */}
            <Card className="p-5">
              <SectionTitle>{tr.alerts}</SectionTitle>
              <div className="space-y-2.5">
                <Link href="/inventory" className="flex items-center justify-between p-3 rounded-xl border border-g-border no-underline hover:bg-g-bg transition-colors">
                  <span className="text-sm text-g-text">{tr.lowStock}</span>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: data.alerts.lowStockCount > 0 ? '#fce8e6' : '#e6f4ea', color: data.alerts.lowStockCount > 0 ? '#d93025' : '#137333' }}>
                    {data.alerts.lowStockCount}
                  </span>
                </Link>
                <Link href="/orders" className="flex items-center justify-between p-3 rounded-xl border border-g-border no-underline hover:bg-g-bg transition-colors">
                  <span className="text-sm text-g-text">{tr.overduePayments}</span>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: data.alerts.overdueUnpaidCount > 0 ? '#fce8e6' : '#e6f4ea', color: data.alerts.overdueUnpaidCount > 0 ? '#d93025' : '#137333' }}>
                    {data.alerts.overdueUnpaidCount}
                  </span>
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
