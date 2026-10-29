import { getOrCreateSettings } from "@/lib/vpn/settingsStore";

export const dynamic = "force-dynamic";

/**
 * Shizuku itself is an Android system-service bridge and cannot run inside a
 * browser preview. This endpoint reports the status that the companion
 * native Android app (see /android-source) would publish at runtime, so the
 * web control center can preview the same settings screen. The real check
 * (`Shizuku.pingBinder()` / `Shizuku.checkSelfPermission()`) lives in
 * `ShizukuBridge.kt` inside the generated Android project.
 */
export async function GET() {
  const settings = await getOrCreateSettings();
  return Response.json({
    connected: settings.shizukuConnected,
    uid: settings.shizukuUid,
    mode: settings.shizukuMode,
    binderAlive: settings.shizukuConnected,
    note: "محاكاة لواجهة التحكم - الفحص الحقيقي يتم داخل تطبيق أندرويد عبر ShizukuBridge.kt",
  });
}
