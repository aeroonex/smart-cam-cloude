import { haptic } from "@/utils/haptic";
import { showSuccess, showError } from "@/utils/toast";

const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform();

export type ShareData = {
  title?: string;
  text?: string;
  url?: string;
};

/**
 * Native "Share Sheet" — planshet/telefonning tizim ulashish oynasini ochadi
 * (Instagram, WhatsApp, SMS, Telegram...). Web da Web Share API ishlatiladi,
 * agar mavjud bo'lmasa havola clipboardga nusxalanadi.
 */
export async function shareNative(data: ShareData): Promise<boolean> {
  const url = data.url ?? window.location.href;
  const payload = { title: data.title, text: data.text, url };

  // 1) Native Capacitor Share plagini (agar o'rnatilgan bo'lsa)
  try {
    if (isNative()) {
      const mod: any = await import(/* @vite-ignore */ "@capacitor/share").catch(() => null);
      if (mod?.Share) {
        await haptic.light();
        await mod.Share.share({
          title: data.title,
          text: data.text,
          url,
          dialogTitle: data.title ?? "Ulashish",
        });
        return true;
      }
    }
  } catch (e: any) {
    // foydalanuvchi bekor qilsa — jim qaytamiz
    if (String(e?.message ?? "").toLowerCase().includes("cancel")) return false;
  }

  // 2) Web Share API (PWA / mobil brauzer)
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await haptic.light();
      await (navigator as any).share(payload);
      return true;
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return false;
  }

  // 3) Fallback — havolani clipboardga nusxalash
  try {
    await navigator.clipboard.writeText(`${data.text ? data.text + "\n" : ""}${url}`);
    showSuccess("Havola nusxalandi");
    return true;
  } catch {
    showError("Ulashib bo'lmadi");
    return false;
  }
}
