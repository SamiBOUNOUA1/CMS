'use client';

import { SectionTitle, Field, FormInput, FormSelect, fmt, btnOutline, removeBtn } from './FormPrimitives';

interface StaffAssignment {
  role: string;
  count: number;
  hours: number;
  ratePerHour: number;
  notes: string;
}

interface StaffRole {
  key: string;
  label: string;
}

interface OrderForm {
  staffAssignments: StaffAssignment[];
}

interface StepStaffProps {
  form: OrderForm;
  setForm: (fn: (f: OrderForm) => OrderForm) => void;
  isMobile: boolean;
  tn: Record<string, Record<string, unknown>>;
  currency?: string;
  staffRoles?: StaffRole[];
}

export const defaultStaff = (roleKey = ''): StaffAssignment => ({ role: roleKey, count: 1, hours: 8, ratePerHour: 25, notes: '' });

export function StepStaff({ form, setForm, isMobile, tn, currency, staffRoles = [] }: StepStaffProps) {
  const ts = tn.staff as Record<string, unknown>;
  const defaultRoleKey = staffRoles.length > 0 ? staffRoles[0].key : '';

  const addStaff = () => setForm(f => ({ ...f, staffAssignments: [...f.staffAssignments, defaultStaff(defaultRoleKey)] }));
  const removeStaff = (i: number) => setForm(f => ({ ...f, staffAssignments: f.staffAssignments.filter((_, idx) => idx !== i) }));
  const setStaffField = (i: number, field: keyof StaffAssignment, val: unknown) => setForm(f => {
    const arr = [...f.staffAssignments];
    arr[i] = { ...arr[i], [field]: val };
    return { ...f, staffAssignments: arr };
  });

  return (
    <div>
      <SectionTitle icon="👨‍🍳" title={String(ts.title)} />
      <p className="text-[13px] text-g-text-2 mb-4">{String(ts.hint)}</p>

      {form.staffAssignments.map((sa, i) => (
        <div
          key={i}
          className="border border-google-gray-200 rounded-xl mb-3.5 bg-[#fafafa]"
          style={{ padding: isMobile ? 14 : 20 }}
        >
          <div className="flex justify-between mb-3.5">
            <span className="font-sans text-sm font-medium text-google-blue">
              {String((ts.staff as (i: number) => string)(i))}
            </span>
            <button onClick={() => removeStaff(i)} className={removeBtn}>{String(ts.remove)}</button>
          </div>

          <div className="flex flex-col gap-3">
            <Field label={String(ts.role)}>
              <FormSelect value={sa.role} onChange={e => setStaffField(i, 'role', e.target.value)}>
                {staffRoles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </FormSelect>
            </Field>

            <div
              className="grid gap-3 items-end"
              style={{ gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr' }}
            >
              <Field label={String(ts.count)}>
                <FormInput type="number" min="1" value={sa.count} onChange={e => setStaffField(i, 'count', e.target.value)} />
              </Field>
              <Field label={String(ts.hours)}>
                <FormInput type="number" min="0" step="0.5" value={sa.hours} onChange={e => setStaffField(i, 'hours', e.target.value)} />
              </Field>
              <Field
                label={String(ts.ratePerHour)}
                style={isMobile ? { gridColumn: '1 / -1' } : undefined}
              >
                <FormInput type="number" min="0" step="0.01" value={sa.ratePerHour} onChange={e => setStaffField(i, 'ratePerHour', e.target.value)} />
              </Field>
            </div>

            <div className="text-right font-sans font-medium text-g-text" style={{ fontSize: isMobile ? 14 : 16 }}>
              = {fmt(Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), currency)}
            </div>
          </div>
        </div>
      ))}

      <button onClick={addStaff} className={`${btnOutline} flex items-center gap-1.5 mt-1`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
        {String(ts.addStaff)}
      </button>
    </div>
  );
}
