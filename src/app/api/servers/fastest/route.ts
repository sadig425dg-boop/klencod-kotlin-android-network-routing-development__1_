import { db } from "@/db";
import { appSettings, servers } from "@/db/schema";
import { serializeServer } from "@/lib/vpn/serialize";
import { pingBatch } from "@/lib/vpn/ping";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST() {
  const all = await db.select().from(servers);
  if (all.length === 0) {
    return Response.json({ error: "لا يوجد أي سيرفر محفوظ" }, { status: 400 });
  }

  const results = await pingBatch(
    all.map((server) => ({ id: server.id, address: server.address, port: server.port })),
  );

  let bestId: number | null = null;
  let bestPing = Number.POSITIVE_INFINITY;

  for (const server of all) {
    const latency = results.get(server.id) ?? null;
    await db
      .update(servers)
      .set({ pingMs: latency, updatedAt: new Date() })
      .where(eq(servers.id, server.id));
    if (latency !== null && latency < bestPing) {
      bestPing = latency;
      bestId = server.id;
    }
  }

  if (bestId === null) {
    return Response.json({ error: "تعذر الوصول لأي سيرفر محفوظ" }, { status: 400 });
  }

  await db.update(servers).set({ isSelected: false });
  await db.update(servers).set({ isSelected: true }).where(eq(servers.id, bestId));
  await db.update(appSettings).set({ selectedServerId: bestId, updatedAt: new Date() }).where(eq(appSettings.id, 1));

  const [row] = await db.select().from(servers).where(eq(servers.id, bestId)).limit(1);
  return Response.json({ server: serializeServer(row) });
}
