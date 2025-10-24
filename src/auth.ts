import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify HMAC SHA256 signature
 */
export function verifySignature(payload: string, signature: string | undefined, secret: string): boolean {
  if (!signature) {
    return false;
  }

  // Compute HMAC
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const digest = 'sha256=' + hmac.digest('hex');

  // Timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    // If lengths don't match, timingSafeEqual throws
    return false;
  }
}
