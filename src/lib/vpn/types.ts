export type Protocol = "vless" | "vmess" | "trojan" | "ss";

export interface ParsedServer {
  name: string;
  protocol: Protocol;
  address: string;
  port: number;
  userId: string;
  rawLink: string;
  params: Record<string, unknown>;
  source: "manual" | "subscription" | "json";
  subscriptionUrl?: string;
}

export interface ServerRecord {
  id: number;
  name: string;
  protocol: Protocol;
  address: string;
  port: number;
  userId: string;
  rawLink: string;
  params: Record<string, unknown>;
  pingMs: number | null;
  isSelected: boolean;
  source: string;
  subscriptionUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettingsRecord {
  id: number;
  vpnConnected: boolean;
  hotspotShared: boolean;
  shizukuMode: "off" | "independent" | "follow_vpn";
  shizukuConnected: boolean;
  shizukuUid: number;
  theme: string;
  fontFamily: string;
  autoSelectFastest: boolean;
  selectedServerId: number | null;
  hotspotSsid: string;
  updatedAt: string;
}
