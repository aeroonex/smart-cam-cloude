import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { nativeToast } from "@/utils/nativeToast";

const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform();

/**
 * #1 — Push Notification (FCM). Qurilma tokenini olib `push_tokens` jadvaliga
 * saqlaydi va kelgan bildirishnomalarni ko'rsatadi. Ilova yopiq bo'lganda
 * tizim banneri Android tomonidan ko'rsatiladi.
 *
 * Faza 3 o'rnatish (Android Studio):
 *   npm i @capacitor/push-notifications && npx cap sync
 *   + android/app/google-services.json (FCM)
 */
export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!isNative() || !userId) return;
    let cleanup: (() => void) | undefined;

    (async () => {
      const mod: any = await import(/* @vite-ignore */ "@capacitor/push-notifications").catch(() => null);
      if (!mod?.PushNotifications) return;
      const PN = mod.PushNotifications;

      const perm = await PN.checkPermissions();
      let status = perm.receive;
      if (status === "prompt") status = (await PN.requestPermissions()).receive;
      if (status !== "granted") return;

      await PN.register();

      const regH = await PN.addListener("registration", async (t: { value: string }) => {
        await supabase.from("push_tokens").upsert(
          { user_id: userId, token: t.value, platform: "android", updated_at: new Date().toISOString() },
          { onConflict: "token" },
        );
      });

      const recvH = await PN.addListener("pushNotificationReceived", (n: any) => {
        nativeToast.info(n.title ?? "Bildirishnoma", n.body);
      });

      const actH = await PN.addListener("pushNotificationActionPerformed", (a: any) => {
        const url = a.notification?.data?.url;
        if (url) window.location.assign(url);
      });

      cleanup = () => { regH.remove(); recvH.remove(); actH.remove(); };
    })();

    return () => cleanup?.();
  }, [userId]);
}
