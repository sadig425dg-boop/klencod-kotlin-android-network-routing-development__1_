import { db } from "@/db";
import { appSettings, servers } from "@/db/schema";
import { serializeSettings } from "@/lib/vpn/serialize";
import { getOrCreateSettings } from "@/lib/vpn/settingsStore";
import { pingBatch } from "@/lib/vpn/ping";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const settings = await getOrCreateSettings();
  const body = (await request.json()) as { target: "vpn" | "hotspot"; value: boolean };

  if (body.target === "vpn" && body.value) {
    // Ensure a server is selected before "connecting" - auto pick fastest if needed.
    if (!settings.selectedServerId && settings.autoSelectFastest) {
      const all = await db.select().from(servers);
      if (all.length > 0) {
        const results = await pingBatch(
          all.map((server) => ({ id: server.id, address: server.address, port: server.port })),
        );
        let bestId: number | null = null;
        let bestPing = Number.POSITIVE_INFINITY;
        for (const server of all) {
          const latency = results.get(server.id) ?? null;
          await db.update(servers).set({ pingMs: latency }).where(eq(servers.id, server.id));
          if (latency !== null && latency < bestPing) {
            bestPing = latency;
            bestId = server.id;
          }
        }
        if (bestId !== null) {
          await db.update(servers).set({ isSelected: false });
          await db.update(servers).set({ isSelected: true }).where(eq(servers.id, bestId));
          await db.update(appSettings).set({ selectedServerId: bestId }).where(eq(appSettings.id, 1));
        }
      }
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.target === "vpn") {
    updates.vpnConnected = body.value;
    // Turning VPN off also drops hotspot-follow sharing automatically.
    if (!body.value) updates.hotspotShared = false;
  }
  if (body.target === "hotspot") {
    updates.hotspotShared = body.value;
  }

  const updated = await db.update(appSettings).set(updates).where(eq(appSettings.id, 1)).returning();
  return Response.json({ settings: serializeSettings(updated[0]) });
}
