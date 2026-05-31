'use client';

export function SectionTitle({ icon, title }) {
  return (
    <h2 style={{ fontFamily: "'Google Sans'", fontSize: 17, fontWeight: 500, color: '#202124', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span>{icon}</span>{title}
    </h2>
  );
}

export function Field({ label, error, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: error ? '#d93025' : '#5f6368', marginBottom: 6, fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#d93025' }}>{error}</p>}
    </div>
  );
}

export function FormInput({ error, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${error ? '#d93025' : '#dadce0'}`,
        fontSize: 14, color: '#202124', background: '#fff',
        outline: 'none', fontFamily: 'Roboto, Arial',
        transition: 'border-color 0.15s', boxSizing: 'border-box',
      }}
      onFocus={e => e.target.style.borderColor = '#1a73e8'}
      onBlur={e => e.target.style.borderColor = error ? '#d93025' : '#dadce0'}
    />
  );
}

export function FormSelect({ children, style, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: '1px solid #dadce0', fontSize: 14, color: '#202124',
        background: '#fff', outline: 'none', fontFamily: 'Roboto, Arial',
        cursor: 'pointer', appearance: 'auto', boxSizing: 'border-box',
        ...style,
      }}
      onFocus={e => e.target.style.borderColor = '#1a73e8'}
      onBlur={e => e.target.style.borderColor = '#dadce0'}
    >
      {children}
    </select>
  );
}

export function FormTextarea({ rows = 3, ...props }) {
  return (
    <textarea
      {...props}
      rows={rows}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: '1px solid #dadce0', fontSize: 14, color: '#202124',
        background: '#fff', outline: 'none', fontFamily: 'Roboto, Arial',
        resize: 'vertical', boxSizing: 'border-box',
      }}
      onFocus={e => e.target.style.borderColor = '#1a73e8'}
      onBlur={e => e.target.style.borderColor = '#dadce0'}
    />
  );
}

export function TotalRow({ label, value, bold, large, color, currency }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ fontSize: large ? 15 : 14, fontWeight: bold ? 500 : 400, color: '#5f6368', fontFamily: "'Google Sans'" }}>{label}</span>
      <span style={{ fontSize: large ? 20 : 14, fontWeight: bold ? 500 : 400, color: color || '#202124', fontFamily: "'Google Sans'" }}>
        {fmt(value, currency)}
      </span>
    </div>
  );
}

export function fmt(n, cur = '€') {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' ' + cur;
}

export const btnFilled = {
  background: '#1a73e8', color: '#fff', border: 'none',
  borderRadius: 24, padding: '10px 28px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
};

export const btnOutline = {
  background: 'transparent', color: '#1a73e8', border: '1px solid #dadce0',
  borderRadius: 24, padding: '10px 24px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
};

export const removeBtn = {
  background: 'transparent', color: '#d93025', border: 'none',
  fontSize: 12, fontFamily: "'Google Sans'", cursor: 'pointer', padding: '4px 8px',
};
