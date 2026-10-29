import { db } from "@/db";
import { appSettings, servers } from "@/db/schema";
import { serializeServer } from "@/lib/vpn/serialize";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const serverId = Number(id);
  if (!Number.isFinite(serverId)) {
    return Response.json({ error: "معرّف غير صالح" }, { status: 400 });
  }
  await db.delete(servers).where(eq(servers.id, serverId));
  await db
    .update(appSettings)
    .set({ selectedServerId: null })
    .where(eq(appSettings.selectedServerId, serverId));
  return Response.json({ ok: true });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const serverId = Number(id);
  if (!Number.isFinite(serverId)) {
    return Response.json({ error: "معرّف غير صالح" }, { status: 400 });
  }
  const body = (await request.json()) as { select?: boolean; name?: string };

  if (body.select) {
    await db.update(servers).set({ isSelected: false });
    await db.update(servers).set({ isSelected: true, updatedAt: new Date() }).where(eq(servers.id, serverId));
    await db.update(appSettings).set({ selectedServerId: serverId }).where(eq(appSettings.id, 1));
  }

  if (typeof body.name === "string" && body.name.trim().length > 0) {
    await db
      .update(servers)
      .set({ name: body.name.trim(), updatedAt: new Date() })
      .where(eq(servers.id, serverId));
  }

  const [row] = await db.select().from(servers).where(eq(servers.id, serverId)).limit(1);
  if (!row) {
    return Response.json({ error: "السيرفر غير موجود" }, { status: 404 });
  }
  return Response.json({ server: serializeServer(row) });
}
