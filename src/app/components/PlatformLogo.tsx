// Same mark as the tenant app's blue logo, but black. Uses theme colors so it
// stays visible in dark mode (light square, dark plus).
export default function PlatformLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="6" fill="var(--google-text-primary)" />
      <path d="M8 14h12M14 8v12" stroke="var(--google-surface)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
