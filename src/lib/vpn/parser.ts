import { decodeBase64Flexible } from "./base64";
import type { ParsedServer, Protocol } from "./types";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function queryToParams(search: string): Record<string, string> {
  const params: Record<string, string> = {};
  const query = new URLSearchParams(search);
  query.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/** vless://uuid@host:port?params#remark */
function parseVless(link: string): ParsedServer {
  const withoutScheme = link.slice("vless://".length);
  const [beforeHash, hash] = withoutScheme.split("#");
  const remark = hash ? safeDecodeURIComponent(hash) : "VLESS Server";
  const [credentialsAndHost, search = ""] = beforeHash.split("?");
  const atIndex = credentialsAndHost.lastIndexOf("@");
  const uuid = credentialsAndHost.slice(0, atIndex);
  const hostPort = credentialsAndHost.slice(atIndex + 1);
  const { address, port } = splitHostPort(hostPort);
  const params = queryToParams(search);

  return {
    name: remark,
    protocol: "vless",
    address,
    port,
    userId: uuid,
    rawLink: link,
    params,
    source: "manual",
  };
}

/** trojan://password@host:port?params#remark */
function parseTrojan(link: string): ParsedServer {
  const withoutScheme = link.slice("trojan://".length);
  const [beforeHash, hash] = withoutScheme.split("#");
  const remark = hash ? safeDecodeURIComponent(hash) : "Trojan Server";
  const [credentialsAndHost, search = ""] = beforeHash.split("?");
  const atIndex = credentialsAndHost.lastIndexOf("@");
  const password = safeDecodeURIComponent(credentialsAndHost.slice(0, atIndex));
  const hostPort = credentialsAndHost.slice(atIndex + 1);
  const { address, port } = splitHostPort(hostPort);
  const params = queryToParams(search);

  return {
    name: remark,
    protocol: "trojan",
    address,
    port,
    userId: password,
    rawLink: link,
    params,
    source: "manual",
  };
}

/** vmess://BASE64(JSON) - v2rayN style */
function parseVmess(link: string): ParsedServer {
  const b64 = link.slice("vmess://".length);
  const decoded = decodeBase64Flexible(b64);
  const json = JSON.parse(decoded) as Record<string, unknown>;

  const address = String(json.add ?? "");
  const port = Number(json.port ?? 443);
  const id = String(json.id ?? "");
  const remark = String(json.ps ?? "VMess Server");

  const params: Record<string, string> = {
    net: String(json.net ?? "tcp"),
    type: String(json.type ?? "none"),
    host: String(json.host ?? ""),
    path: String(json.path ?? ""),
    tls: String(json.tls ?? ""),
    sni: String(json.sni ?? ""),
    alpn: String(json.alpn ?? ""),
    fp: String(json.fp ?? ""),
    aid: String(json.aid ?? "0"),
    scy: String(json.scy ?? "auto"),
    v: String(json.v ?? "2"),
  };

  return {
    name: remark,
    protocol: "vmess",
    address,
    port,
    userId: id,
    rawLink: link,
    params,
    source: "manual",
  };
}

/** ss://BASE64(method:password)@host:port?plugin=...#remark (SIP002) or
 *  ss://BASE64(method:password@host:port)#remark (legacy) */
function parseShadowsocks(link: string): ParsedServer {
  const withoutScheme = link.slice("ss://".length);
  const [beforeHash, hash] = withoutScheme.split("#");
  const remark = hash ? safeDecodeURIComponent(hash) : "Shadowsocks Server";

  let method = "aes-256-gcm";
  let password = "";
  let address = "";
  let port = 8388;
  let params: Record<string, string> = {};

  if (beforeHash.includes("@")) {
    // SIP002 style: BASE64(method:password)@host:port?plugin=...
    const [userInfoRaw, hostPortAndQuery] = beforeHash.split("@");
    const [hostPort, search = ""] = hostPortAndQuery.split("?");
    let userInfo = userInfoRaw;
    try {
      userInfo = decodeBase64Flexible(userInfoRaw);
    } catch {
      userInfo = safeDecodeURIComponent(userInfoRaw);
    }
    const sep = userInfo.indexOf(":");
    method = userInfo.slice(0, sep) || method;
    password = userInfo.slice(sep + 1);
    const split = splitHostPort(hostPort);
    address = split.address;
    port = split.port;
    params = queryToParams(search);
  } else {
    // legacy style: BASE64(method:password@host:port)
    const decoded = decodeBase64Flexible(beforeHash);
    const atIndex = decoded.lastIndexOf("@");
    const methodPassword = decoded.slice(0, atIndex);
    const hostPort = decoded.slice(atIndex + 1);
    const sep = methodPassword.indexOf(":");
    method = methodPassword.slice(0, sep) || method;
    password = methodPassword.slice(sep + 1);
    const split = splitHostPort(hostPort);
    address = split.address;
    port = split.port;
  }

  return {
    name: remark,
    protocol: "ss",
    address,
    port,
    userId: `${method}:${password}`,
    rawLink: link,
    params: { ...params, method },
    source: "manual",
  };
}

function splitHostPort(hostPort: string): { address: string; port: number } {
  // Support IPv6 literals in brackets: [::1]:443
  if (hostPort.startsWith("[")) {
    const closeIndex = hostPort.indexOf("]");
    const address = hostPort.slice(1, closeIndex);
    const portPart = hostPort.slice(closeIndex + 2);
    return { address, port: Number(portPart) || 443 };
  }
  const lastColon = hostPort.lastIndexOf(":");
  if (lastColon === -1) {
    return { address: hostPort, port: 443 };
  }
  return {
    address: hostPort.slice(0, lastColon),
    port: Number(hostPort.slice(lastColon + 1)) || 443,
  };
}

export function detectProtocol(link: string): Protocol | null {
  const trimmed = link.trim();
  if (trimmed.startsWith("vless://")) return "vless";
  if (trimmed.startsWith("vmess://")) return "vmess";
  if (trimmed.startsWith("trojan://")) return "trojan";
  if (trimmed.startsWith("ss://")) return "ss";
  return null;
}

export function parseShareLink(rawLink: string): ParsedServer {
  const trimmed = rawLink.trim();
  const protocol = detectProtocol(trimmed);
  if (!protocol) {
    throw new Error("رابط غير مدعوم. الصيغ المدعومة: vless:// vmess:// trojan:// ss://");
  }
  switch (protocol) {
    case "vless":
      return parseVless(trimmed);
    case "vmess":
      return parseVmess(trimmed);
    case "trojan":
      return parseTrojan(trimmed);
    case "ss":
      return parseShadowsocks(trimmed);
  }
}

/** Extracts ParsedServer entries from a full Xray/V2Ray JSON client config. */
export function parseXrayJsonConfig(jsonText: string): ParsedServer[] {
  const config = JSON.parse(jsonText) as Record<string, unknown>;
  const outbounds = Array.isArray(config.outbounds)
    ? (config.outbounds as Record<string, unknown>[])
    : Array.isArray(config)
      ? (config as unknown as Record<string, unknown>[])
      : [config];

  const servers: ParsedServer[] = [];

  for (const outbound of outbounds) {
    const protocol = String(outbound.protocol ?? "");
    const settings = (outbound.settings ?? {}) as Record<string, unknown>;
    const streamSettings = (outbound.streamSettings ?? {}) as Record<string, unknown>;
    const network = String(streamSettings.network ?? "tcp");
    const security = String(streamSettings.security ?? "none");
    const tag = typeof outbound.tag === "string" ? outbound.tag : undefined;

    const streamParams: Record<string, string> = {
      net: network,
      security,
    };
    if (streamSettings.wsSettings) {
      const ws = streamSettings.wsSettings as Record<string, unknown>;
      streamParams.path = String(ws.path ?? "/");
      const headers = (ws.headers ?? {}) as Record<string, unknown>;
      streamParams.host = String(headers.Host ?? "");
    }
    if (streamSettings.tlsSettings) {
      const tls = streamSettings.tlsSettings as Record<string, unknown>;
      streamParams.sni = String(tls.serverName ?? "");
    }
    if (streamSettings.realitySettings) {
      const reality = streamSettings.realitySettings as Record<string, unknown>;
      streamParams.sni = String(reality.serverName ?? "");
      streamParams.pbk = String(reality.publicKey ?? "");
      streamParams.sid = String(reality.shortId ?? "");
      streamParams.fp = String(reality.fingerprint ?? "chrome");
    }

    if (protocol === "vless" || protocol === "vmess") {
      const vnext = (settings.vnext ?? []) as Record<string, unknown>[];
      for (const entry of vnext) {
        const users = (entry.users ?? []) as Record<string, unknown>[];
        for (const user of users) {
          servers.push({
            name: tag ?? `${protocol.toUpperCase()}-${entry.address}`,
            protocol: protocol as Protocol,
            address: String(entry.address ?? ""),
            port: Number(entry.port ?? 443),
            userId: String(user.id ?? ""),
            rawLink: JSON.stringify(outbound),
            params: {
              ...streamParams,
              flow: String(user.flow ?? ""),
              encryption: String(user.encryption ?? "none"),
              aid: String(user.alterId ?? "0"),
            },
            source: "json",
          });
        }
      }
    } else if (protocol === "trojan") {
      const serverList = (settings.servers ?? []) as Record<string, unknown>[];
      for (const entry of serverList) {
        servers.push({
          name: tag ?? `Trojan-${entry.address}`,
          protocol: "trojan",
          address: String(entry.address ?? ""),
          port: Number(entry.port ?? 443),
          userId: String(entry.password ?? ""),
          rawLink: JSON.stringify(outbound),
          params: streamParams,
          source: "json",
        });
      }
    } else if (protocol === "shadowsocks") {
      const serverList = (settings.servers ?? []) as Record<string, unknown>[];
      for (const entry of serverList) {
        servers.push({
          name: tag ?? `SS-${entry.address}`,
          protocol: "ss",
          address: String(entry.address ?? ""),
          port: Number(entry.port ?? 8388),
          userId: `${String(entry.method ?? "aes-256-gcm")}:${String(entry.password ?? "")}`,
          rawLink: JSON.stringify(outbound),
          params: { method: String(entry.method ?? "aes-256-gcm") },
          source: "json",
        });
      }
    }
  }

  return servers;
}
