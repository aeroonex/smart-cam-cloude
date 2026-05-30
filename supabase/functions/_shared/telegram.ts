export async function telegramRequest(token: string, method: string, body?: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API error on ${method}`);
  }

  return data.result;
}

function isIgnorableTelegramError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("message is not modified") ||
    message.includes("message to edit not found") ||
    message.includes("there is no text in the message to edit")
  );
}

export async function telegramRequestSafe(
  token: string,
  method: string,
  body?: Record<string, unknown>,
) {
  try {
    return await telegramRequest(token, method, body);
  } catch (error) {
    if (isIgnorableTelegramError(error)) {
      return null;
    }
    throw error;
  }
}

export function parseCallbackData(data: string) {
  const firstColon = data.indexOf(":");
  if (firstColon === -1) {
    return { action: data, token: null, extra: null };
  }

  const action = data.slice(0, firstColon);
  const rest = data.slice(firstColon + 1);
  const lastColon = rest.lastIndexOf(":");

  if (lastColon === -1) {
    return { action, token: rest, extra: null };
  }

  return {
    action,
    token: rest.slice(0, lastColon),
    extra: rest.slice(lastColon + 1),
  };
}

export function formatPrice(value: number) {
  return `${new Intl.NumberFormat("uz-UZ").format(value)} so'm`;
}

export function normalizeUuid(value: string) {
  const clean = value.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  if (clean.length !== 32) return null;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

export function encodeOrderToken(orderId: string) {
  return orderId.replace(/-/g, "_");
}

export function encodeOrderRef(orderId: string) {
  return orderId.replace(/-/g, "").slice(0, 8).toLowerCase();
}

export function decodeOrderToken(token: string) {
  return normalizeUuid(token.replace(/_/g, ""));
}

export function isShortOrderRef(token: string) {
  const clean = token.replace(/_/g, "").toLowerCase();
  return /^[a-f0-9]{6,12}$/.test(clean);
}

export async function signLinkPayload(token: string, raw: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export async function verifyLinkPayload({
  botToken,
  compactUserId,
  timestamp,
  signature,
}: {
  botToken: string;
  compactUserId: string;
  timestamp: string;
  signature: string;
}) {
  const expected = await signLinkPayload(botToken, `${compactUserId}:${timestamp}`);
  const createdAt = Number.parseInt(timestamp, 36);

  if (!createdAt || Number.isNaN(createdAt)) {
    return false;
  }

  const age = Math.floor(Date.now() / 1000) - createdAt;
  return expected === signature && age >= 0 && age <= 60 * 30;
}
