// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { getBucket, tenantObjectPath } from '@/lib/storage';
import { requirePermission } from '@/lib/requireAuth';
import { serverError } from '@/lib/logger';
import { randomBytes } from 'crypto';

// The browser-declared type is only a claim: check the file's first bytes.
function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 6 && ['GIF87a', 'GIF89a'].includes(buf.subarray(0, 6).toString('latin1'))) return 'image/gif';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const EXT_MAP = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

async function POST_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_inventory');
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5 MB.' }, { status: 400 });
    }

    const realType = sniffImageType(buffer);
    if (!realType || !ALLOWED_TYPES.includes(realType)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    const ext = EXT_MAP[realType];
    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;
    const objectPath = tenantObjectPath(`inventory/${filename}`);

    // Store in Cloud Storage — the local container filesystem is ephemeral on
    // Firebase App Hosting (Cloud Run) and is not served as static content.
    await getBucket().file(objectPath).save(buffer, {
      resumable: false,
      contentType: realType,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    });

    // Served back through our streaming route (keeps the bucket private).
    return NextResponse.json({ url: `/api/inventory/image/${filename}` });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const POST = withTenant(POST_);
