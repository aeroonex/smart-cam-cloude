import { haptic } from "@/utils/haptic";

const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform();

/**
 * #4 — Kamera orqali QR/shtrix-kod skaner.
 * Native qurilmada @capacitor-mlkit/barcode-scanning plagini ishlatiladi
 * (agar o'rnatilgan bo'lsa). Aks holda qo'lda kiritish so'raladi.
 *
 * Faza 3 da Android Studio da quyidagi plagin o'rnatiladi:
 *   npm i @capacitor-mlkit/barcode-scanning && npx cap sync
 */
export async function scanBarcode(): Promise<string | null> {
  if (isNative()) {
    try {
      const mod: any = await import(/* @vite-ignore */ "@capacitor-mlkit/barcode-scanning").catch(() => null);
      if (mod?.BarcodeScanner) {
        const { BarcodeScanner } = mod;
        const { camera } = await BarcodeScanner.requestPermissions();
        if (camera !== "granted" && camera !== "limited") {
          return promptManual();
        }
        await haptic.light();
        const { barcodes } = await BarcodeScanner.scan();
        const value = barcodes?.[0]?.rawValue ?? null;
        if (value) await haptic.success();
        return value;
      }
    } catch {
      // plagin yo'q yoki bekor qilindi
    }
  }

  // Web / plagin yo'q — qo'lda kiritish
  return promptManual();
}

function promptManual(): string | null {
  const v = window.prompt("Buyurtma QR/kodi (kamera mavjud emas — qo'lda kiriting):");
  return v?.trim() || null;
}
