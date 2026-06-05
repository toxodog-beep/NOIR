import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";

export function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAdminSessionToken({
  username,
  secret,
  now = Date.now(),
  ttlMs = 1000 * 60 * 60 * 8,
}) {
  if (!username) throw new Error("username is required");
  if (!secret) throw new Error("session secret is required");

  const expiresAt = now + ttlMs;
  const payload = Buffer.from(JSON.stringify({ username, expiresAt })).toString("base64url");
  const signature = signPayload(payload, secret);

  return `${TOKEN_VERSION}.${payload}.${signature}`;
}

export function verifyAdminSessionToken({ token, secret, now = Date.now() }) {
  if (!token || !secret) return null;

  const [version, payload, signature] = String(token).split(".");
  if (version !== TOKEN_VERSION || !payload || !signature) return null;
  if (!safeEqual(signature, signPayload(payload, secret))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.username || Number(session.expiresAt) <= now) return null;
    return session;
  } catch {
    return null;
  }
}

function signPayload(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
