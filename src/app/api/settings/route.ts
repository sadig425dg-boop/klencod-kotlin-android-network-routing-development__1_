import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { serializeSettings } from "@/lib/vpn/serialize";
import { getOrCreateSettings } from "@/lib/vpn/settingsStore";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getOrCreateSettings();
  return Response.json({ settings: serializeSettings(settings) });
}

const ALLOWED_SHIZUKU_MODES = new Set(["off", "independent", "follow_vpn"]);
const ALLOWED_FONTS = new Set(["cairo", "thmanyah", "tajawal"]);
const ALLOWED_THEMES = new Set(["neon_pink", "neon_violet"]);

export async function PUT(request: Request) {
  await getOrCreateSettings();
  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof body.hotspotShared === "boolean") updates.hotspotShared = body.hotspotShared;
  if (typeof body.vpnConnected === "boolean") updates.vpnConnected = body.vpnConnected;
  if (typeof body.autoSelectFastest === "boolean") updates.autoSelectFastest = body.autoSelectFastest;
  if (typeof body.hotspotSsid === "string" && body.hotspotSsid.trim().length > 0) {
    updates.hotspotSsid = body.hotspotSsid.trim();
  }
  if (typeof body.shizukuMode === "string" && ALLOWED_SHIZUKU_MODES.has(body.shizukuMode)) {
    updates.shizukuMode = body.shizukuMode;
  }
  if (typeof body.fontFamily === "string" && ALLOWED_FONTS.has(body.fontFamily)) {
    updates.fontFamily = body.fontFamily;
  }
  if (typeof body.theme === "string" && ALLOWED_THEMES.has(body.theme)) {
    updates.theme = body.theme;
  }
  if (body.selectedServerId === null || typeof body.selectedServerId === "number") {
    updates.selectedServerId = body.selectedServerId;
  }

  updates.updatedAt = new Date();

  const updated = await db.update(appSettings).set(updates).where(eq(appSettings.id, 1)).returning();
  return Response.json({ settings: serializeSettings(updated[0]) });
}
