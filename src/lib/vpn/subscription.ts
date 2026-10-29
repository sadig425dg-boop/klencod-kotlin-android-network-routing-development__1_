import { decodeBase64Flexible, looksLikeBase64 } from "./base64";
import { detectProtocol, parseShareLink, parseXrayJsonConfig } from "./parser";
import type { ParsedServer } from "./types";

const SHARE_SCHEMES = ["vless://", "vmess://", "trojan://", "ss://"];

function containsShareLinks(text: string): boolean {
  return SHARE_SCHEMES.some((scheme) => text.includes(scheme));
}

function extractLinksFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && detectProtocol(line) !== null);
}

/**
 * Parses arbitrary pasted input: a single share link, multiple links (one per
 * line), a base64-encoded subscription blob, or a raw Xray/V2Ray JSON config.
 */
export function parseImportText(input: string): { servers: ParsedServer[]; errors: string[] } {
  const trimmed = input.trim();
  const errors: string[] = [];
  const servers: ParsedServer[] = [];

  if (trimmed.length === 0) {
    return { servers, errors: ["النص المدخل فارغ"] };
  }

  // 1) Raw JSON config (Xray/V2Ray outbounds)
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      servers.push(...parseXrayJsonConfig(trimmed));
      return { servers, errors };
    } catch (error) {
      errors.push(`تعذر تفكيك JSON: ${(error as Error).message}`);
      return { servers, errors };
    }
  }

  // 2) Multiple / single plain share links
  if (containsShareLinks(trimmed)) {
    const lines = extractLinksFromText(trimmed).length > 0 ? extractLinksFromText(trimmed) : [trimmed];
    for (const line of lines) {
      try {
        servers.push(parseShareLink(line));
      } catch (error) {
        errors.push((error as Error).message);
      }
    }
    return { servers, errors };
  }

  // 3) base64 encoded subscription blob containing links
  if (looksLikeBase64(trimmed)) {
    try {
      const decoded = decodeBase64Flexible(trimmed);
      if (containsShareLinks(decoded)) {
        const lines = extractLinksFromText(decoded);
        for (const line of lines) {
          try {
            servers.push(parseShareLink(line));
          } catch (error) {
            errors.push((error as Error).message);
          }
        }
        return { servers, errors };
      }
    } catch {
      // fallthrough
    }
  }

  errors.push("تعذر التعرف على صيغة الكود أو الاشتراك المدخل");
  return { servers, errors };
}

/** Fetches a subscription URL and parses the resulting server list. */
export async function fetchSubscription(
  url: string,
): Promise<{ servers: ParsedServer[]; errors: string[] }> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Shizzi/1.0 (compatible; v2rayNG)" },
    cache: "no-store",
  });
  if (!response.ok) {
    return { servers: [], errors: [`فشل تحميل الاشتراك: HTTP ${response.status}`] };
  }
  const body = await response.text();
  const { servers, errors } = parseImportText(body);
  return {
    servers: servers.map((server) => ({ ...server, source: "subscription", subscriptionUrl: url })),
    errors,
  };
}

export function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
