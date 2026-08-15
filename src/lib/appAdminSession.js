const SECRET = process.env.APP_ADMIN_SESSION_SECRET || 'linkp-app-admin-session-v1-2026';

const bytes = value => new TextEncoder().encode(value);

export function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export async function signPayload(encoded) {
  const key = await crypto.subtle.importKey('raw', bytes(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, bytes(encoded));
  return Buffer.from(signature).toString('base64url');
}

export async function createAppAdminToken(email, role) {
  const encoded = encodePayload({ email: email.toLowerCase(), role, exp: Date.now() + 5 * 60 * 1000 });
  return `${encoded}.${await signPayload(encoded)}`;
}

export async function verifyAppAdminToken(token) {
  try {
    const [encoded, signature] = String(token || '').split('.');
    if (!encoded || !signature || (await signPayload(encoded)) !== signature) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}
