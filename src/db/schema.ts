import {
  bigserial,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// -----------------------------------------------------------------------
// Shizzi Web Control Center - database schema
// -----------------------------------------------------------------------

export const servers = pgTable("servers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  protocol: text("protocol").notNull(), // vless | vmess | trojan | ss
  address: text("address").notNull(),
  port: integer("port").notNull(),
  userId: text("user_id").notNull().default(""), // uuid / password / method:password
  rawLink: text("raw_link").notNull(),
  params: jsonb("params").notNull().default({}),
  pingMs: integer("ping_ms"),
  isSelected: boolean("is_selected").notNull().default(false),
  source: text("source").notNull().default("manual"), // manual | subscription | json
  subscriptionUrl: text("subscription_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  vpnConnected: boolean("vpn_connected").notNull().default(false),
  hotspotShared: boolean("hotspot_shared").notNull().default(false),
  shizukuMode: text("shizuku_mode").notNull().default("follow_vpn"), // off | independent | follow_vpn
  shizukuConnected: boolean("shizuku_connected").notNull().default(true),
  shizukuUid: integer("shizuku_uid").notNull().default(2000),
  theme: text("theme").notNull().default("neon_pink"),
  fontFamily: text("font_family").notNull().default("cairo"),
  autoSelectFastest: boolean("auto_select_fastest").notNull().default(true),
  selectedServerId: integer("selected_server_id"),
  hotspotSsid: text("hotspot_ssid").notNull().default("Shizzi-Hotspot"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
