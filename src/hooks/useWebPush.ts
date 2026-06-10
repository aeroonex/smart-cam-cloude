import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { firebaseConfig, VAPID_KEY } from "@/lib/firebaseConfig";
import { nativeToast } from "@/utils/nativeToast";

const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform();

const FB_VER = "10.13.0";

export type WebPushResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

/**
 * Web push tokenini olib `push_tokens` jadvaliga saqlaydi.
 * Tugma bosilganda ham, avtomat ham chaqirsa bo'ladi.
 */
export async function enableWebPush(userId: string): Promise<WebPushResult> {
  if (isNative()) return { ok: false, reason: "native (APK push ishlatiladi)" };
  if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, reason: "Brauzer push'ni qo'llamaydi (HTTPS kerak)" };
  }

  try {
    const [appMod, messagingMod] = await Promise.all([
      import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`),
      import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FB_VER}/firebase-messaging.js`),
    ]);
    const { initializeApp } = appMod as any;
    const { getMessaging, getToken, onMessage, isSupported } = messagingMod as any;

    if (!(await isSupported())) return { ok: false, reason: "Bu brauzer push'ni qo'llamaydi" };

    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "Ruxsat berilmadi (" + perm + ")" };

    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) return { ok: false, reason: "Token olinmadi" };

    await supabase.from("push_tokens").upsert(
      { user_id: userId, token, platform: "web", updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );

    onMessage(messaging, (payload: any) => {
      nativeToast.info(payload.notification?.title ?? "Bildirishnoma", payload.notification?.body);
    });

    return { ok: true, token };
  } catch (e: any) {
    console.warn("[enableWebPush]", e);
    return { ok: false, reason: e?.message ?? "Xato" };
  }
}

/**
 * Avtomat — ruxsat ALLAQACHON berilgan bo'lsa jim tokenni yangilaydi.
 * (Ruxsat so'ramaydi; birinchi marta tugma orqali so'raladi.)
 */
export function useWebPush(userId: string | undefined) {
  useEffect(() => {
    if (isNative() || !userId) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return; // faqat allaqachon ruxsat berilgan bo'lsa
    void enableWebPush(userId);
  }, [userId]);
}
