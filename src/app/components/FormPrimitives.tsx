'use client';

import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, CSSProperties } from 'react';

interface SectionTitleProps {
  icon: string;
  title: string;
}

export function SectionTitle({ icon, title }: SectionTitleProps) {
  return (
    <h2 className="font-sans text-[17px] font-medium text-g-text m-0 mb-[18px] flex items-center gap-2.5">
      <span>{icon}</span>{title}
    </h2>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Field({ label, error, children, className, style }: FieldProps) {
  return (
    <div className={className} style={style}>
      <label className={`block text-[11px] font-medium font-sans uppercase tracking-[0.04em] mb-1.5 ${error ? 'text-google-red' : 'text-g-text-2'}`}>
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-google-red m-0">{error}</p>}
    </div>
  );
}

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function FormInput({ error, className, ...props }: FormInputProps) {
  return (
    <input
      {...props}
      className={`w-full py-2.5 px-3.5 rounded-lg border text-sm text-g-text bg-white outline-none font-[Roboto,Arial] transition-[border-color] duration-150 box-border focus:border-google-blue ${error ? 'border-google-red' : 'border-g-border'} ${className ?? ''}`}
    />
  );
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

export function FormSelect({ children, className, style, ...props }: FormSelectProps) {
  return (
    <select
      {...props}
      style={style}
      className={`w-full py-2.5 px-3.5 rounded-lg border border-g-border text-sm text-g-text bg-white outline-none font-[Roboto,Arial] cursor-pointer box-border appearance-auto focus:border-google-blue ${className ?? ''}`}
    >
      {children}
    </select>
  );
}

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function FormTextarea({ rows = 3, className, ...props }: FormTextareaProps) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={`w-full py-2.5 px-3.5 rounded-lg border border-g-border text-sm text-g-text bg-white outline-none font-[Roboto,Arial] resize-y box-border focus:border-google-blue ${className ?? ''}`}
    />
  );
}

interface TotalRowProps {
  label: string;
  value: number;
  bold?: boolean;
  large?: boolean;
  color?: string;
  currency?: string;
}

export function TotalRow({ label, value, bold, large, color, currency }: TotalRowProps) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span
        className="font-sans"
        style={{ fontSize: large ? 15 : 14, fontWeight: bold ? 500 : 400, color: 'var(--google-text-secondary)' }}
      >
        {label}
      </span>
      <span
        className="font-sans"
        style={{ fontSize: large ? 20 : 14, fontWeight: bold ? 500 : 400, color: color ?? 'var(--google-text-primary)' }}
      >
        {fmt(value, currency)}
      </span>
    </div>
  );
}

export function fmt(n: number | undefined, cur = '€'): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' ' + cur;
}

// Tailwind className strings for common button variants
export const btnFilled =
  'bg-google-blue text-white border-none rounded-full py-2.5 px-7 text-sm font-sans font-medium cursor-pointer inline-flex items-center';

export const btnOutline =
  'bg-transparent text-google-blue border border-g-border rounded-full py-2.5 px-6 text-sm font-sans font-medium cursor-pointer';

export const removeBtn =
  'bg-transparent text-google-red border-none text-xs font-sans cursor-pointer py-1 px-2';
