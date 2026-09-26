// Shared printable-layout config for the quote (devis) and payment receipt PDFs.
// Defaults mirror the DocumentLayoutSettings schema in models.ts.

export type FontStyle = 'serif' | 'sans';

export interface DocumentLayout {
  accentColor: string;
  fontStyle: FontStyle;
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showVatNumber: boolean;
  showStaffSection: boolean;
  showOrderItems: boolean;
  /** When false, item options still list by name but their surcharge is hidden. */
  showOptionPrices: boolean;
  showClientNotes: boolean;
  showInternalNotes: boolean;
  showExternalNotes: boolean;
  showFooter: boolean;
}

export const DEFAULT_LAYOUT: DocumentLayout = {
  accentColor: '#c9a96e',
  fontStyle: 'serif',
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showEmail: true,
  showVatNumber: true,
  showStaffSection: true,
  showOrderItems: true,
  showOptionPrices: true,
  showClientNotes: true,
  showInternalNotes: false,
  showExternalNotes: true,
  showFooter: true,
};

const SERIF = "'Georgia', 'Times New Roman', serif";
const SANS = "'Google Sans', Arial, sans-serif";

export function docFontFamily(fontStyle?: FontStyle): string {
  return fontStyle === 'sans' ? SANS : SERIF;
}

// Merge a partial settings object (e.g. from the API) over the defaults.
export function resolveLayout(partial?: Partial<DocumentLayout> | null): DocumentLayout {
  return { ...DEFAULT_LAYOUT, ...(partial || {}) };
}
