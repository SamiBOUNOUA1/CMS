"use client"
export default function NavLink({ href, label }) {
  return (
    <a
      href={href}
      style={{
        fontFamily: "'Google Sans', Arial, sans-serif",
        fontSize: 14,
        fontWeight: 500,
        color: '#5f6368',
        padding: '6px 12px',
        borderRadius: 20,
        textDecoration: 'none',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => {
        e.target.style.background = '#f1f3f4';
        e.target.style.color = '#202124';
      }}
      onMouseLeave={e => {
        e.target.style.background = 'transparent';
        e.target.style.color = '#5f6368';
      }}
    >
      {label}
    </a>
  );
}