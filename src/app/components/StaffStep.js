'use client';

import { SectionTitle, Field, FormInput, FormSelect, fmt, btnOutline, removeBtn } from './FormPrimitives';

export const STAFF_ROLES = ['head-chef', 'sous-chef', 'server', 'bartender', 'coordinator', 'other'];
export const defaultStaff = () => ({ role: 'server', count: 1, hours: 8, ratePerHour: 25, notes: '' });

export function StepStaff({ form, setForm, isMobile, tn, currency }) {
  const ts = tn.staff;

  const addStaff = () => setForm(f => ({ ...f, staffAssignments: [...f.staffAssignments, defaultStaff()] }));
  const removeStaff = i => setForm(f => ({ ...f, staffAssignments: f.staffAssignments.filter((_, idx) => idx !== i) }));
  const setStaffField = (i, field, val) => setForm(f => {
    const arr = [...f.staffAssignments];
    arr[i] = { ...arr[i], [field]: val };
    return { ...f, staffAssignments: arr };
  });

  return (
    <div>
      <SectionTitle icon="👨‍🍳" title={ts.title} />
      <p style={{ fontSize: 13, color: '#5f6368', marginBottom: 16 }}>{ts.hint}</p>
      {form.staffAssignments.map((sa, i) => (
        <div key={i} style={{ border: '1px solid #e8eaed', borderRadius: 12, padding: isMobile ? 14 : 20, marginBottom: 14, background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: '#1a73e8' }}>{ts.staff(i)}</span>
            {form.staffAssignments.length > 1 && <button onClick={() => removeStaff(i)} style={removeBtn}>{ts.remove}</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label={ts.role}>
              <FormSelect value={sa.role} onChange={e => setStaffField(i, 'role', e.target.value)}>
                {STAFF_ROLES.map(r => <option key={r} value={r}>{tn.staffRoles[r]}</option>)}
              </FormSelect>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12, alignItems: 'flex-end' }}>
              <Field label={ts.count}>
                <FormInput type="number" min="1" value={sa.count} onChange={e => setStaffField(i, 'count', e.target.value)} />
              </Field>
              <Field label={ts.hours}>
                <FormInput type="number" min="0" step="0.5" value={sa.hours} onChange={e => setStaffField(i, 'hours', e.target.value)} />
              </Field>
              <Field label={ts.ratePerHour} style={isMobile ? { gridColumn: '1 / -1' } : {}}>
                <FormInput type="number" min="0" step="0.01" value={sa.ratePerHour} onChange={e => setStaffField(i, 'ratePerHour', e.target.value)} />
              </Field>
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'Google Sans'", fontSize: isMobile ? 14 : 16, fontWeight: 500, color: '#202124' }}>
              = {fmt(Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), currency)}
            </div>
          </div>
        </div>
      ))}
      <button onClick={addStaff} style={{ ...btnOutline, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
        {ts.addStaff}
      </button>
    </div>
  );
}
