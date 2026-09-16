// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getBucket } from '@/lib/storage';

// Streams an inventory image out of the (private) Cloud Storage bucket.
// Auth is enforced by middleware via the cq_token cookie, which the browser
// sends automatically on same-origin <img> requests.
export async function GET(_request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const name = params.name;
    // Guard against path traversal / nested paths — filenames are flat.
    if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const file = getBucket().file(`inventory/${name}`);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': metadata.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
