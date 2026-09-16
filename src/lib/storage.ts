// @ts-nocheck
import { Storage } from '@google-cloud/storage';

// On Firebase App Hosting (Cloud Run) the runtime service account is picked up
// automatically via Application Default Credentials — no key file needed.
// For local development, authenticate once with:
//   gcloud auth application-default login
// or point GOOGLE_APPLICATION_CREDENTIALS at a service-account JSON key file.

let _storage: Storage | null = null;

function getStorage(): Storage {
  if (!_storage) _storage = new Storage();
  return _storage;
}

/**
 * Resolves the Cloud Storage bucket name. Prefer the explicit STORAGE_BUCKET
 * env var; otherwise fall back to the project's default Firebase bucket.
 */
export function getBucketName(): string {
  if (process.env.STORAGE_BUCKET) return process.env.STORAGE_BUCKET;

  let projectId =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT;

  if (!projectId && process.env.FIREBASE_CONFIG) {
    try {
      projectId = JSON.parse(process.env.FIREBASE_CONFIG).projectId;
    } catch {
      /* ignore malformed config */
    }
  }

  if (!projectId) {
    throw new Error(
      'Cloud Storage bucket is not configured. Set the STORAGE_BUCKET environment variable.'
    );
  }
  // Default Firebase bucket for modern projects.
  return `${projectId}.firebasestorage.app`;
}

export function getBucket() {
  return getStorage().bucket(getBucketName());
}
