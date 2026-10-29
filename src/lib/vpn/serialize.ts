import type { servers, appSettings } from "@/db/schema";
import type { AppSettingsRecord, ServerRecord } from "./types";

type ServerRow = typeof servers.$inferSelect;
type SettingsRow = typeof appSettings.$inferSelect;

export function serializeServer(row: ServerRow): ServerRecord {
  return {
    id: row.id,
    name: row.name,
    protocol: row.protocol as ServerRecord["protocol"],
    address: row.address,
    port: row.port,
    userId: row.userId,
    rawLink: row.rawLink,
    params: (row.params ?? {}) as Record<string, unknown>,
    pingMs: row.pingMs,
    isSelected: row.isSelected,
    source: row.source,
    subscriptionUrl: row.subscriptionUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeSettings(row: SettingsRow): AppSettingsRecord {
  return {
    id: row.id,
    vpnConnected: row.vpnConnected,
    hotspotShared: row.hotspotShared,
    shizukuMode: row.shizukuMode as AppSettingsRecord["shizukuMode"],
    shizukuConnected: row.shizukuConnected,
    shizukuUid: row.shizukuUid,
    theme: row.theme,
    fontFamily: row.fontFamily,
    autoSelectFastest: row.autoSelectFastest,
    selectedServerId: row.selectedServerId,
    hotspotSsid: row.hotspotSsid,
    updatedAt: row.updatedAt.toISOString(),
  };
}
