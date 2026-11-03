'use client';

import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0-5a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 16a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm9-9h-2a1 1 0 0 0 0 2h2a1 1 0 0 0 0-2zM5 12a1 1 0 0 1-1 1H2a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1zm12.07-7.07a1 1 0 0 1 0 1.41l-1.41 1.42a1 1 0 1 1-1.42-1.42l1.42-1.41a1 1 0 0 1 1.41 0zm-12.73 0a1 1 0 0 1 1.41 0l1.42 1.41a1 1 0 1 1-1.42 1.42L4.93 6.34a1 1 0 0 1 0-1.41zm12.73 14.14a1 1 0 0 1-1.41 0l-1.42-1.41a1 1 0 1 1 1.42-1.42l1.41 1.42a1 1 0 0 1 0 1.41zm-12.73 0a1 1 0 0 1 0-1.41l1.42-1.42a1 1 0 1 1 1.42 1.42l-1.42 1.41a1 1 0 0 1-1.42 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SystemIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h6v2H8v2h8v-2h-2v-2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 13H4V5h16v11z" />
  </svg>
);

export const THEME_OPTIONS = [
  { value: 'light', Icon: SunIcon, labelKey: 'themeLight' },
  { value: 'dark', Icon: MoonIcon, labelKey: 'themeDark' },
  { value: 'system', Icon: SystemIcon, labelKey: 'themeSystem' },
] as const;

// Compact light / dark / system pill used in the app nav and platform header.
export default function ThemeSwitch() {
  const { t } = useLanguage();
  const { theme, switchTheme } = useTheme();
  return (
    <div className="flex rounded-full border border-g-border overflow-hidden flex-shrink-0">
      {THEME_OPTIONS.map(({ value, Icon, labelKey }) => (
        <button
          key={value}
          onClick={() => switchTheme(value)}
          title={t.nav[labelKey]}
          aria-label={t.nav[labelKey]}
          aria-pressed={theme === value}
          className="py-1 px-2.5 border-none cursor-pointer text-xs font-sans font-medium flex items-center transition-[background,color] duration-150"
          style={{
            background: theme === value ? '#1a73e8' : 'transparent',
            color: theme === value ? '#fff' : 'var(--google-text-secondary)',
          }}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
