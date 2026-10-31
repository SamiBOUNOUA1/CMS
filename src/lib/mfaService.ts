// @ts-nocheck
/**
 * Two-factor (TOTP) account operations shared by tenant users (User) and
 * platform operators (PlatformAdmin). Tenant callers must already be inside a
 * tenant context (withTenant) or runAsSystem.
 */
import { compare } from 'bcryptjs';
import {
  generateSecret, buildOtpauthUrl, qrDataUrl, verifyTotp,
  encryptSecret, decryptSecret, generateRecoveryCodes, consumeRecoveryCode,
} from '@/lib/mfa';

const MFA_FIELDS = '+mfaSecret +mfaPendingSecret +mfaRecoveryCodes +mfaLastStep';

export const MFA_CLEAR = {
  $set: { mfaEnabled: false },
  $unset: { mfaSecret: 1, mfaPendingSecret: 1, mfaRecoveryCodes: 1, mfaLastStep: 1 },
};

export function loadWithMfa(Model, id) {
  return Model.findById(id).select(`${MFA_FIELDS} +passwordHash`);
}

export async function mfaStatus(Model, id) {
  const doc = await Model.findById(id).select('+mfaRecoveryCodes');
  if (!doc) return null;
  return { enabled: !!doc.mfaEnabled, recoveryCodesRemaining: doc.mfaEnabled ? (doc.mfaRecoveryCodes?.length ?? 0) : 0 };
}

/** Creates a pending secret and returns what the user needs to scan it. */
export async function startSetup(Model, id) {
  const doc = await Model.findById(id);
  if (!doc) return { error: 'Not found', status: 404 };
  if (doc.mfaEnabled) return { error: 'Two-factor authentication is already enabled', status: 400 };
  const secret = generateSecret();
  await Model.updateOne({ _id: id }, { mfaPendingSecret: encryptSecret(secret) });
  const url = buildOtpauthUrl(doc.email, secret);
  return { qr: await qrDataUrl(url), manualKey: secret.match(/.{1,4}/g).join(' ') };
}

/** Confirms the pending secret with a code and turns MFA on. Returns recovery codes. */
export async function confirmSetup(Model, id, code) {
  const doc = await loadWithMfa(Model, id);
  if (!doc) return { error: 'Not found', status: 404 };
  if (doc.mfaEnabled) return { error: 'Two-factor authentication is already enabled', status: 400 };
  if (!doc.mfaPendingSecret) return { error: 'Start the setup first', status: 400 };
  const step = verifyTotp(decryptSecret(doc.mfaPendingSecret), code);
  if (step === null) return { error: 'invalid_code', status: 400 };
  const { codes, hashes } = generateRecoveryCodes();
  await Model.updateOne({ _id: id }, {
    $set: { mfaEnabled: true, mfaSecret: doc.mfaPendingSecret, mfaRecoveryCodes: hashes, mfaLastStep: step },
    $unset: { mfaPendingSecret: 1 },
  });
  return { recoveryCodes: codes, label: doc.name || doc.email };
}

/**
 * Checks a second factor (TOTP code or recovery code) against a doc loaded
 * with loadWithMfa, and persists the replay step / consumed recovery code.
 */
export async function checkSecondFactor(Model, doc, { code, recoveryCode }) {
  if (!doc?.mfaEnabled || !doc.mfaSecret) return false;
  if (code) {
    const step = verifyTotp(decryptSecret(doc.mfaSecret), code, doc.mfaLastStep ?? 0);
    if (step === null) return false;
    // Conditional update so two concurrent requests can't both use the same step.
    const r = await Model.updateOne(
      { _id: doc._id, $or: [{ mfaLastStep: { $lt: step } }, { mfaLastStep: { $exists: false } }] },
      { mfaLastStep: step },
    );
    return r.modifiedCount === 1;
  }
  if (recoveryCode) {
    const remaining = consumeRecoveryCode(doc.mfaRecoveryCodes, recoveryCode);
    if (!remaining) return false;
    const r = await Model.updateOne(
      { _id: doc._id, mfaRecoveryCodes: { $size: doc.mfaRecoveryCodes.length } },
      { mfaRecoveryCodes: remaining },
    );
    return r.modifiedCount === 1;
  }
  return false;
}

/** Turns MFA off. Requires the current password and a valid second factor. */
export async function disableMfa(Model, id, { currentPassword, code, recoveryCode }) {
  const doc = await loadWithMfa(Model, id);
  if (!doc) return { error: 'Not found', status: 404 };
  if (!doc.mfaEnabled) return { ok: true };
  if (!currentPassword || !(await compare(currentPassword, doc.passwordHash)))
    return { error: 'invalid_password', status: 400 };
  if (!(await checkSecondFactor(Model, doc, { code, recoveryCode })))
    return { error: 'invalid_code', status: 400 };
  await Model.updateOne({ _id: id }, MFA_CLEAR);
  return { ok: true, label: doc.name || doc.email };
}

/** Replaces the recovery codes after verifying a current TOTP code. */
export async function regenerateRecoveryCodes(Model, id, code) {
  const doc = await loadWithMfa(Model, id);
  if (!doc) return { error: 'Not found', status: 404 };
  if (!doc.mfaEnabled) return { error: 'Two-factor authentication is not enabled', status: 400 };
  if (!(await checkSecondFactor(Model, doc, { code })))
    return { error: 'invalid_code', status: 400 };
  const { codes, hashes } = generateRecoveryCodes();
  await Model.updateOne({ _id: id }, { mfaRecoveryCodes: hashes });
  return { recoveryCodes: codes };
}
