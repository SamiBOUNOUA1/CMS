// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, CompanySettings } from '@/lib/models';
import { getAuth } from '@/lib/requireAuth';
import { getTenantLicense } from '@/lib/license';
import { serverError } from '@/lib/logger';

async function GET_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const [user, settings, license] = await Promise.all([
      User.findById(auth.userId).select('-passwordHash').lean(),
      CompanySettings.findOne({}).select('companyName logoUrl').lean(),
      getTenantLicense(auth.tenantId),
    ]);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // The company the user belongs to: its own branding name, else the tenant name.
    const company = { name: settings?.companyName || license.name || '', logoUrl: settings?.logoUrl || '' };
    return NextResponse.json({ user: { ...user, permissions: auth.permissions }, company });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
