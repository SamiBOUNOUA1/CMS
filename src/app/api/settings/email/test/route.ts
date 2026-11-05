// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { loadEmailSettings, sendEmail, userFacingError } from '@/lib/email';

export const runtime = 'nodejs';

// POST /api/settings/email/test: sends a test email (to body.to or the current user)
async function POST_(request: NextRequest) {
  let settings = null;
  try {
    const { auth, error } = await requirePermission(request, 'manage_integrations');
    if (error) return error;
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const me = await User.findById(auth.userId).select('email').lean();
    const to = String(body.to || me?.email || '').trim();
    if (!to) return NextResponse.json({ error: 'no_email', message: 'No recipient email address.' }, { status: 400 });

    settings = await loadEmailSettings();
    const fr = settings.language !== 'en';
    await sendEmail(settings, {
      to,
      type: 'test',
      subject: fr ? 'E-mail de test' : 'Test email',
      text: fr ? 'Votre configuration e-mail fonctionne.' : 'Your email setup is working.',
      sentBy: auth.userId,
    });
    return NextResponse.json({ ok: true, to });
  } catch (err: unknown) {
    return NextResponse.json({ error: userFacingError(settings, err) }, { status: 500 });
  }
}

export const POST = withTenant(POST_);
