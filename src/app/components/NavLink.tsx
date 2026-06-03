'use client';

interface NavLinkProps {
  href: string;
  label: string;
}

export default function NavLink({ href, label }: NavLinkProps) {
  return (
    <a
      href={href}
      className="text-sm font-medium text-g-text-2 py-1.5 px-3 rounded-full no-underline transition-[background-color,color] duration-150 hover:bg-google-gray-100 hover:text-g-text"
    >
      {label}
    </a>
  );
}
