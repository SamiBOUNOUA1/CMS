// @ts-nocheck
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/LanguageContext';
import { useToast } from '@/app/components/Toast';
import {
  btnFilled, btnOutline, Field, FormCard, FormGrid, FormInput, FormSelect, FormTextarea, formPageCls,
} from '@/app/components/FormPrimitives';
import { CASE_CATEGORIES, CASE_PRIORITIES, CASE_SUBJECT_MAX, CASE_BODY_MAX } from '@/lib/supportCases';

export default function NewSupportCasePage() {
  const t = useT();
  const ts = t.support;
  const router = useRouter();
  const showToast = useToast();
  const [form, setForm] = useState({ subject: '', category: 'technical', priority: 'normal', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.subject.trim()) errs.subject = ts.subjectRequired;
    if (!form.description.trim()) errs.description = ts.descriptionRequired;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ts.error);
      showToast(ts.created, 'success');
      router.push(`/support/${data.case._id}`);
    } catch (err) {
      showToast(err.message || ts.error, 'error');
      setSaving(false);
    }
  };

  return (
    <div className={formPageCls}>
      <Link href="/support" className="text-sm text-google-blue no-underline">← {ts.back}</Link>
      <h1 className="text-[22px] font-medium text-g-text mt-3 mb-1">{ts.newTitle}</h1>
      <p className="text-sm text-g-text-2 mt-0 mb-5">{ts.newSubtitle}</p>

      <form onSubmit={submit}>
        <FormCard>
          <div className="flex flex-col gap-4">
            <Field label={ts.subject} error={errors.subject}>
              <FormInput value={form.subject} onChange={set('subject')} maxLength={CASE_SUBJECT_MAX}
                placeholder={ts.subjectPlaceholder} error={errors.subject} autoFocus />
            </Field>
            <FormGrid>
              <Field label={ts.category}>
                <FormSelect value={form.category} onChange={set('category')}>
                  {CASE_CATEGORIES.map(c => <option key={c} value={c}>{ts.categories[c]}</option>)}
                </FormSelect>
              </Field>
              <Field label={ts.priority}>
                <FormSelect value={form.priority} onChange={set('priority')}>
                  {CASE_PRIORITIES.map(p => <option key={p} value={p}>{ts.priorities[p]}</option>)}
                </FormSelect>
              </Field>
            </FormGrid>
            <Field label={ts.description} error={errors.description}>
              <FormTextarea rows={8} value={form.description} onChange={set('description')} maxLength={CASE_BODY_MAX}
                placeholder={ts.descriptionPlaceholder} />
            </Field>
          </div>
        </FormCard>

        <div className="flex justify-end gap-3 mt-5">
          <Link href="/support" className={`${btnOutline} no-underline`}>{ts.cancel}</Link>
          <button type="submit" className={btnFilled} disabled={saving}>{saving ? ts.submitting : ts.submit}</button>
        </div>
      </form>
    </div>
  );
}
