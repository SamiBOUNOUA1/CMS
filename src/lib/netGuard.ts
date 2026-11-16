import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * Guards outbound connections to hosts chosen by a tenant (their SMTP server):
 * the server must not be usable to reach its own network (loopback, private
 * ranges, the cloud metadata address).
 */

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||   // carrier-grade NAT
    (a === 169 && b === 254) ||             // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224                                // multicast / reserved
  );
}

function isPrivateV6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === '::' || v === '::1') return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') ||
    v.startsWith('fea') || v.startsWith('feb') || v.startsWith('ff');
}

export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateV4(ip);
  if (kind === 6) return isPrivateV6(ip);
  return true; // not an IP address at all
}

/** Quick check on the name itself, for validating a settings form. */
export function hostLooksInternal(host: string): boolean {
  const h = String(host || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (isIP(h)) return isPrivateAddress(h);
  return h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local') || !h.includes('.');
}

/** Throws unless every address the host resolves to is a public one. */
export async function assertPublicHost(host: string): Promise<void> {
  const h = String(host || '').trim().replace(/^\[|\]$/g, '');
  if (hostLooksInternal(h)) throw new Error('This mail server address is not allowed.');
  if (isIP(h)) return;
  const addrs = await lookup(h, { all: true });
  if (!addrs.length || addrs.some(a => isPrivateAddress(a.address))) {
    throw new Error('This mail server address is not allowed.');
  }
}
