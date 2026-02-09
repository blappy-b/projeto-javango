import crypto from "crypto";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding ? normalized + "=".repeat(4 - padding) : normalized;
  return Buffer.from(padded, "base64").toString("utf8");
}

function signPayload(payloadString) {
  const secret = process.env.TICKET_QR_SECRET;
  if (!secret) {
    throw new Error("TICKET_QR_SECRET não configurado");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createTicketHash(ticketId) {
  const payload = {
    tid: ticketId,
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyTicketHash(token, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  if (!token || typeof token !== "string") return null;

  // Compatibilidade com MVP atual: o QR contém apenas o ID do ticket
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return { tid: token };
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  try {
    const expectedSignature = signPayload(encodedPayload);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload?.tid || !payload?.iat) return null;

    const age = Math.floor(Date.now() / 1000) - payload.iat;
    if (age > maxAgeSeconds) return null;

    return payload;
  } catch {
    return null;
  }
}
