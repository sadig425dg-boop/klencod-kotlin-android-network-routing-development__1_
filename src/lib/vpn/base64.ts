/**
 * Decode a base64 / base64url string that may be missing padding, the way
 * most V2Ray / Xray share links and subscription payloads are produced.
 */
export function decodeBase64Flexible(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, "");
  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64").toString("utf-8");
}

export function encodeBase64(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64");
}

export function looksLikeBase64(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length === 0) return false;
  return /^[A-Za-z0-9+/_-]+={0,2}$/.test(trimmed.replace(/\s+/g, ""));
}
