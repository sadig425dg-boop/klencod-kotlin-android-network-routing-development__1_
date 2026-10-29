import { db } from "@/db";
import { appSettings, servers } from "@/db/schema";
import { fetchSubscription, isLikelyUrl, parseImportText } from "@/lib/vpn/subscription";
import { serializeServer } from "@/lib/vpn/serialize";
import { getOrCreateSettings } from "@/lib/vpn/settingsStore";
import { asc, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(servers)
    .orderBy(
      sql`${servers.pingMs} IS NULL`,
      asc(servers.pingMs),
      desc(servers.createdAt),
    );
  return Response.json({ servers: rows.map(serializeServer) });
}

export async function POST(request: Request) {
  await getOrCreateSettings();
  const body = (await request.json()) as { text?: string };
  const text = (body.text ?? "").trim();

  if (!text) {
    return Response.json({ error: "الرجاء إدخال كود اتصال أو رابط اشتراك" }, { status: 400 });
  }

  const result = isLikelyUrl(text) && !text.startsWith("vless://") && !text.startsWith("vmess://")
    ? await fetchSubscription(text)
    : parseImportText(text);

  if (result.servers.length === 0) {
    return Response.json(
      { error: result.errors.join(" / ") || "تعذر العثور على أي سيرفر صالح" },
      { status: 400 },
    );
  }

  const inserted = await db
    .insert(servers)
    .values(
      result.servers.map((server) => ({
        name: server.name || `${server.protocol.toUpperCase()}-${server.address}`,
        protocol: server.protocol,
        address: server.address,
        port: server.port,
        userId: server.userId,
        rawLink: server.rawLink,
        params: server.params,
        source: server.source,
        subscriptionUrl: server.subscriptionUrl ?? null,
      })),
    )
    .returning();

  return Response.json({
    servers: inserted.map(serializeServer),
    warnings: result.errors,
  });
}
