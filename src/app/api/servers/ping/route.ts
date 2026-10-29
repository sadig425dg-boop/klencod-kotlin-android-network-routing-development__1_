import { db } from "@/db";
import { servers } from "@/db/schema";
import { serializeServer } from "@/lib/vpn/serialize";
import { pingBatch } from "@/lib/vpn/ping";
import { eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { id?: number };

  const targets = body.id
    ? await db.select().from(servers).where(eq(servers.id, body.id))
    : await db.select().from(servers);

  if (targets.length === 0) {
    return Response.json({ servers: [] });
  }

  const results = await pingBatch(
    targets.map((server) => ({ id: server.id, address: server.address, port: server.port })),
  );

  const ids = Array.from(results.keys());
  for (const id of ids) {
    await db
      .update(servers)
      .set({ pingMs: results.get(id) ?? null, updatedAt: new Date() })
      .where(eq(servers.id, id));
  }

  const updated = await db.select().from(servers).where(inArray(servers.id, ids));
  return Response.json({ servers: updated.map(serializeServer) });
}
