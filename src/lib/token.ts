// Minimal self-contained bearer token (HMAC-signed, stateless) for the
// OAuth2 client-credentials flow. Good enough for a demo API surface —
// not a full JWT implementation.

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(str.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function issueAccessToken(clientId: string, secret: string): Promise<{ token: string; expiresIn: number }> {
  const payload = { cid: clientId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS };
  const payloadB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = b64urlEncode(new Uint8Array(sig));
  return { token: `${payloadB64}.${sigB64}`, expiresIn: TOKEN_TTL_SECONDS };
}

export async function verifyAccessToken(token: string, secret: string): Promise<{ clientId: string } | null> {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecode(sigB64),
    new TextEncoder().encode(payloadB64)
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64))) as { cid: string; exp: number };
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { clientId: payload.cid };
  } catch {
    return null;
  }
}
