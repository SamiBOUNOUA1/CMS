'use client';

import { useState, useEffect, useRef } from 'react';
import { useT } from '@/lib/LanguageContext';

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
);
const IconUpload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);
const IconWarning = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);
const IconSpinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);
const IconFile = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExportGroup {
  key: string;
  labelKey: string;
  collections: string[];
}

interface ValidationResult {
  collections: Record<string, { label: string; total: number; conflicts: number }>;
  warnings: string[];
}

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

type ImportState = 'idle' | 'validating' | 'review' | 'importing' | 'done';

const EXPORT_GROUPS: ExportGroup[] = [
  {
    key: 'settings',
    labelKey: 'settings',
    collections: ['companySettings', 'eventTypeConfigs', 'orderStatusConfigs', 'customerTypeConfigs', 'staffRoleConfigs', 'travelRegionConfigs', 'flowTemplates', 'moduleConfigs'],
  },
  {
    key: 'catalog',
    labelKey: 'catalog',
    collections: ['categories', 'products'],
  },
  {
    key: 'inventory',
    labelKey: 'inventory',
    collections: ['inventoryCategories', 'suppliers', 'warehouses', 'inventoryItems'],
  },
  {
    key: 'kitchen',
    labelKey: 'kitchen',
    collections: ['kitchenStockItems', 'kitchenRecipes'],
  },
  {
    key: 'customers',
    labelKey: 'customers',
    collections: ['clients', 'venues'],
  },
  {
    key: 'admin',
    labelKey: 'admin',
    collections: ['roles', 'rolePermissions'],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border border-[#dadce0] bg-white"
      style={{ padding: '24px 28px' }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{ width: 36, height: 36, background: '#e8f0fe', color: '#1a73e8' }}>
        {icon}
      </span>
      <div>
        <h2 className="text-base font-semibold text-[#202124] m-0" style={{ fontFamily: "'Google Sans'" }}>
          {title}
        </h2>
        <p className="text-sm text-[#5f6368] m-0 mt-0.5" style={{ fontFamily: "'Google Sans'" }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DataManagementPage() {
  const t = useT();
  const td = t.dataManagementPage;

  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [permLoading, setPermLoading] = useState(true);

  // Export state
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set(EXPORT_GROUPS.map(g => g.key))
  );
  const [exporting, setExporting] = useState(false);

  // Import state machine
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importFile, setImportFile] = useState<unknown>(null);
  const [fileName, setFileName] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [conflictMode, setConflictMode] = useState<'skip' | 'overwrite'>('skip');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setPerms(d?.user?.permissions ?? {});
        setPermLoading(false);
      })
      .catch(() => setPermLoading(false));
  }, []);

  // ── Export ──────────────────────────────────────────────────────────────────
  function toggleGroup(key: string) {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function selectAllGroups() {
    setSelectedGroups(new Set(EXPORT_GROUPS.map(g => g.key)));
  }

  function deselectAllGroups() {
    setSelectedGroups(new Set());
  }

  async function handleExport() {
    if (selectedGroups.size === 0) return;
    setExporting(true);
    try {
      const groups = Array.from(selectedGroups).join(',');
      const res = await fetch(`/api/settings/export?groups=${groups}`, {
        headers: { 'x-user-permissions': JSON.stringify(perms) },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catering-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — user sees no change, could add a toast here
    } finally {
      setExporting(false);
    }
  }

  // ── Import file handling ────────────────────────────────────────────────────
  async function processFile(file: File) {
    if (!file.name.endsWith('.json')) return;
    setFileName(file.name);
    setImportState('validating');
    setImportError('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setImportFile(parsed);

      const res = await fetch('/api/settings/import/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-permissions': JSON.stringify(perms),
        },
        body: JSON.stringify({ data: parsed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? td.validateFailed);
      }
      const result: ValidationResult = await res.json();
      setValidation(result);
      setImportState('review');
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : td.validateFailed);
      setImportState('idle');
    }
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  async function handleImport() {
    if (!importFile) return;
    setImportState('importing');
    setImportError('');
    try {
      const res = await fetch('/api/settings/import/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-permissions': JSON.stringify(perms),
        },
        body: JSON.stringify({ data: importFile, mode: conflictMode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? td.importFailed);
      }
      const result: ImportResult = await res.json();
      setImportResult(result);
      setImportState('done');
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : td.importFailed);
      setImportState('review');
    }
  }

  function resetImport() {
    setImportState('idle');
    setImportFile(null);
    setFileName('');
    setValidation(null);
    setImportResult(null);
    setImportError('');
    setConflictMode('skip');
  }

  // ── Permission guard ────────────────────────────────────────────────────────
  if (permLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
        <span className="text-sm text-[#5f6368]" style={{ fontFamily: "'Google Sans'" }}>Loading…</span>
      </div>
    );
  }

  if (!perms.manage_data) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
        <span className="text-sm text-[#d93025]" style={{ fontFamily: "'Google Sans'" }}>Access denied.</span>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 780 }}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-medium text-[#202124] m-0" style={{ fontFamily: "'Google Sans'" }}>
          {td.title}
        </h1>
        <p className="text-sm text-[#5f6368] mt-1 m-0" style={{ fontFamily: "'Google Sans'" }}>
          {td.subtitle}
        </p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ── EXPORT SECTION ─────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle
            icon={<IconDownload />}
            title={td.exportSection}
            subtitle={td.exportDescription}
          />

          {/* Group selection */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-[0.05em]"
                style={{ fontFamily: "'Google Sans'" }}>
                Data groups
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAllGroups}
                  className="text-[12px] text-[#1a73e8] border-none bg-transparent cursor-pointer p-0 hover:underline"
                  style={{ fontFamily: "'Google Sans'" }}
                >
                  {td.selectAll}
                </button>
                <span className="text-[#dadce0]">·</span>
                <button
                  onClick={deselectAllGroups}
                  className="text-[12px] text-[#1a73e8] border-none bg-transparent cursor-pointer p-0 hover:underline"
                  style={{ fontFamily: "'Google Sans'" }}
                >
                  {td.deselectAll}
                </button>
              </div>
            </div>

            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {EXPORT_GROUPS.map(group => {
                const checked = selectedGroups.has(group.key);
                return (
                  <label
                    key={group.key}
                    className="flex items-center gap-2.5 cursor-pointer rounded-lg border transition-colors duration-[120ms]"
                    style={{
                      padding: '10px 14px',
                      borderColor: checked ? '#1a73e8' : '#dadce0',
                      background: checked ? '#f0f4ff' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGroup(group.key)}
                      className="w-4 h-4 cursor-pointer accent-[#1a73e8]"
                    />
                    <span className="text-sm font-medium"
                      style={{
                        fontFamily: "'Google Sans'",
                        color: checked ? '#1a73e8' : '#3c4043',
                      }}>
                      {td.groups[group.labelKey as keyof typeof td.groups]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#f1f3f4]">
            <span className="text-xs text-[#5f6368]" style={{ fontFamily: "'Google Sans'" }}>
              {selectedGroups.size} of {EXPORT_GROUPS.length} groups selected
            </span>
            <button
              onClick={handleExport}
              disabled={exporting || selectedGroups.size === 0}
              className="flex items-center gap-2 rounded-lg text-sm font-medium text-white border-none cursor-pointer"
              style={{
                background: exporting || selectedGroups.size === 0 ? '#dadce0' : '#1a73e8',
                color: exporting || selectedGroups.size === 0 ? '#80868b' : 'white',
                padding: '9px 18px',
                fontFamily: "'Google Sans'",
                cursor: exporting || selectedGroups.size === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {exporting ? <IconSpinner /> : <IconDownload />}
              {exporting ? td.exporting : td.exportButton}
            </button>
          </div>
        </SectionCard>

        {/* ── IMPORT SECTION ─────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle
            icon={<IconUpload />}
            title={td.importSection}
            subtitle={td.importDescription}
          />

          {/* ── State: idle ── */}
          {importState === 'idle' && (
            <>
              {importError && (
                <div className="flex items-center gap-2 rounded-lg mb-4 text-sm"
                  style={{ padding: '10px 14px', background: '#fce8e6', color: '#d93025', fontFamily: "'Google Sans'" }}>
                  <IconWarning />
                  {importError}
                </div>
              )}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-[150ms]"
                style={{
                  padding: '40px 20px',
                  borderColor: dragging ? '#1a73e8' : '#dadce0',
                  background: dragging ? '#f0f4ff' : '#fafafa',
                }}
              >
                <span style={{ color: '#9aa0a6' }}><IconFile /></span>
                <p className="text-sm text-[#5f6368] mt-3 mb-1" style={{ fontFamily: "'Google Sans'" }}>
                  {td.importDropzone}{' '}
                  <span className="text-[#1a73e8] font-medium">{td.importBrowse}</span>
                </p>
                <p className="text-xs text-[#9aa0a6] m-0" style={{ fontFamily: "'Google Sans'" }}>
                  {td.importJsonOnly}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={onFileInputChange}
                />
              </div>
            </>
          )}

          {/* ── State: validating ── */}
          {importState === 'validating' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <span className="text-[#1a73e8]"><IconSpinner /></span>
              <p className="text-sm text-[#5f6368] m-0" style={{ fontFamily: "'Google Sans'" }}>
                {td.validating}
              </p>
              <p className="text-xs text-[#9aa0a6] m-0" style={{ fontFamily: "'Google Sans'" }}>
                {fileName}
              </p>
            </div>
          )}

          {/* ── State: review ── */}
          {importState === 'review' && validation && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-[#202124] m-0" style={{ fontFamily: "'Google Sans'" }}>
                    {td.review.title}
                  </p>
                  <p className="text-xs text-[#5f6368] mt-0.5 m-0" style={{ fontFamily: "'Google Sans'" }}>
                    {fileName}
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="rounded-lg mb-4 text-sm"
                  style={{ padding: '12px 14px', background: '#fef7e0', color: '#f9ab00', fontFamily: "'Google Sans'" }}>
                  <p className="font-medium m-0 mb-1 flex items-center gap-1.5">
                    <IconWarning /> {td.review.warnings}
                  </p>
                  {validation.warnings.map((w, i) => (
                    <p key={i} className="m-0 text-xs text-[#202124]">{w}</p>
                  ))}
                </div>
              )}

              {/* Validation table */}
              <div className="rounded-lg border border-[#dadce0] overflow-hidden mb-5">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {[td.review.colCollection, td.review.colNew, td.review.colConflicts, td.review.colAction].map(h => (
                        <th key={h} className="text-left text-[11px] font-semibold text-[#5f6368] uppercase tracking-[0.04em]"
                          style={{ padding: '10px 14px', fontFamily: "'Google Sans'", borderBottom: '1px solid #dadce0' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(validation.collections).map(([key, info], idx) => {
                      const newCount = info.total - info.conflicts;
                      const hasConflicts = info.conflicts > 0;
                      return (
                        <tr key={key} style={{ borderTop: idx > 0 ? '1px solid #f1f3f4' : 'none' }}>
                          <td style={{ padding: '10px 14px', fontFamily: "'Google Sans'", color: '#202124', fontWeight: 500 }}>
                            {td.collections[key as keyof typeof td.collections] ?? key}
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: "'Google Sans'", color: newCount > 0 ? '#137333' : '#9aa0a6' }}>
                            {newCount}
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: "'Google Sans'", color: hasConflicts ? '#f9ab00' : '#9aa0a6' }}>
                            {info.conflicts}
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: "'Google Sans'", color: '#5f6368', fontSize: 12 }}>
                            {newCount > 0 && (
                              <span className="flex items-center gap-1 text-[#137333]">
                                <IconCheck /> {td.review.actionInsert}
                              </span>
                            )}
                            {hasConflicts && (
                              <span className="flex items-center gap-1 mt-0.5"
                                style={{ color: conflictMode === 'overwrite' ? '#d93025' : '#9aa0a6' }}>
                                {conflictMode === 'overwrite' ? td.review.actionOverwrite : td.review.actionSkip}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Conflict resolution */}
              {Object.values(validation.collections).some(c => c.conflicts > 0) && (
                <div className="rounded-lg border border-[#dadce0] mb-5" style={{ padding: '14px 16px' }}>
                  <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-[0.04em] m-0 mb-3"
                    style={{ fontFamily: "'Google Sans'" }}>
                    {td.review.conflictMode}
                  </p>
                  <div className="flex flex-col gap-2">
                    {(['skip', 'overwrite'] as const).map(mode => (
                      <label key={mode} className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="conflictMode"
                          value={mode}
                          checked={conflictMode === mode}
                          onChange={() => setConflictMode(mode)}
                          className="mt-0.5 accent-[#1a73e8]"
                        />
                        <span className="text-sm text-[#202124]" style={{ fontFamily: "'Google Sans'" }}>
                          {mode === 'skip' ? td.review.modeSkip : td.review.modeOverwrite}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {importError && (
                <div className="flex items-center gap-2 rounded-lg mb-4 text-sm"
                  style={{ padding: '10px 14px', background: '#fce8e6', color: '#d93025', fontFamily: "'Google Sans'" }}>
                  <IconWarning />
                  {importError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={resetImport}
                  className="text-sm font-medium rounded-lg border cursor-pointer"
                  style={{
                    padding: '9px 18px',
                    fontFamily: "'Google Sans'",
                    color: '#1a73e8',
                    background: 'transparent',
                    borderColor: '#dadce0',
                  }}
                >
                  {td.review.cancel}
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 rounded-lg text-sm font-medium text-white border-none cursor-pointer"
                  style={{
                    padding: '9px 18px',
                    background: '#1a73e8',
                    fontFamily: "'Google Sans'",
                  }}
                >
                  <IconUpload />
                  {td.review.proceed}
                </button>
              </div>
            </div>
          )}

          {/* ── State: importing ── */}
          {importState === 'importing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <span className="text-[#1a73e8]"><IconSpinner /></span>
              <p className="text-sm text-[#5f6368] m-0" style={{ fontFamily: "'Google Sans'" }}>
                {td.importing}
              </p>
            </div>
          )}

          {/* ── State: done ── */}
          {importState === 'done' && importResult && (
            <div>
              <div className="flex items-center gap-3 rounded-lg mb-5"
                style={{ padding: '14px 16px', background: '#e6f4ea' }}>
                <span className="flex items-center justify-center rounded-full"
                  style={{ width: 32, height: 32, background: '#137333', color: 'white', flexShrink: 0 }}>
                  <IconCheck />
                </span>
                <p className="text-sm font-medium text-[#137333] m-0" style={{ fontFamily: "'Google Sans'" }}>
                  {td.done.title}
                </p>
              </div>

              <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {[
                  { label: td.done.inserted(importResult.inserted), color: '#137333', bg: '#e6f4ea' },
                  { label: td.done.updated(importResult.updated), color: '#1a73e8', bg: '#e8f0fe' },
                  { label: td.done.skipped(importResult.skipped), color: '#5f6368', bg: '#f1f3f4' },
                ].map((stat, i) => (
                  <div key={i} className="rounded-lg text-center"
                    style={{ padding: '12px 8px', background: stat.bg }}>
                    <p className="text-sm font-semibold m-0" style={{ color: stat.color, fontFamily: "'Google Sans'" }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-lg mb-5 text-sm"
                  style={{ padding: '12px 14px', background: '#fce8e6', fontFamily: "'Google Sans'" }}>
                  <p className="font-medium m-0 mb-1 text-[#d93025]">{td.done.errors}</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="m-0 text-xs text-[#202124]">{e}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={resetImport}
                  className="text-sm font-medium rounded-lg border cursor-pointer"
                  style={{
                    padding: '9px 18px',
                    fontFamily: "'Google Sans'",
                    color: '#1a73e8',
                    background: 'transparent',
                    borderColor: '#dadce0',
                  }}
                >
                  {td.done.importAnother}
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
