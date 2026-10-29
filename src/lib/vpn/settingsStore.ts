import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getOrCreateSettings() {
  const existing = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }
  const inserted = await db.insert(appSettings).values({ id: 1 }).returning();
  return inserted[0];
}
