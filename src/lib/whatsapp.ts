const GRAPH_VERSION = 'v20.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface WhatsAppConfig {
  enabled?: boolean;
  phoneNumberId?: string;
  accessToken?: string;
  defaultCountryCode?: string;
}

/**
 * Normalizes a raw phone number into the digits-only international format that
 * the WhatsApp Cloud API expects (no '+', no spaces/punctuation).
 */
export function normalizePhone(raw: string, defaultCountryCode = ''): string {
  const trimmed = (raw || '').trim();
  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');
  const cc = (defaultCountryCode || '').replace(/\D/g, '');

  if (hasPlus) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return cc + digits.slice(1);
  if (cc && !digits.startsWith(cc)) return cc + digits;
  return digits;
}

async function graphError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message || JSON.stringify(data);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

/** Uploads a PDF to WhatsApp media storage and returns the media id. */
export async function uploadMedia(config: WhatsAppConfig, pdf: Buffer, filename: string): Promise<string> {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'application/pdf');
  form.append('file', new Blob([pdf as unknown as BlobPart], { type: 'application/pdf' }), filename);

  const res = await fetch(`${GRAPH_BASE}/${config.phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.accessToken}` },
    body: form,
  });
  if (!res.ok) throw new Error(`WhatsApp media upload failed: ${await graphError(res)}`);
  const data = await res.json();
  if (!data.id) throw new Error('WhatsApp media upload returned no id');
  return data.id as string;
}

interface SendOptions {
  to: string;
  mediaId: string;
  filename: string;
  templateName?: string;
  templateLang?: string;
  bodyParams?: string[];
}

/** Sends a document message — as an approved template when configured, otherwise a plain document (24h-window only). */
export async function sendDocumentMessage(config: WhatsAppConfig, opts: SendOptions): Promise<void> {
  const { to, mediaId, filename, templateName, templateLang, bodyParams } = opts;

  let body: Record<string, unknown>;
  if (templateName) {
    const components: Record<string, unknown>[] = [
      { type: 'header', parameters: [{ type: 'document', document: { id: mediaId, filename } }] },
    ];
    if (bodyParams && bodyParams.length) {
      components.push({ type: 'body', parameters: bodyParams.map(text => ({ type: 'text', text })) });
    }
    body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: templateLang || 'fr' }, components },
    };
  } else {
    body = {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: { id: mediaId, filename },
    };
  }

  const res = await fetch(`${GRAPH_BASE}/${config.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`WhatsApp send failed: ${await graphError(res)}`);
}

/** Convenience: upload a PDF then send it as a document message. */
export async function sendPdfDocument(
  config: WhatsAppConfig,
  opts: { to: string; pdf: Buffer; filename: string; templateName?: string; templateLang?: string; bodyParams?: string[] },
): Promise<void> {
  const mediaId = await uploadMedia(config, opts.pdf, opts.filename);
  await sendDocumentMessage(config, {
    to: opts.to,
    mediaId,
    filename: opts.filename,
    templateName: opts.templateName,
    templateLang: opts.templateLang,
    bodyParams: opts.bodyParams,
  });
}
