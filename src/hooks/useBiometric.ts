import { supabase } from "@/integrations/supabase/client";

const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform();

const CRED_KEY = "biometric_session";

/**
 * #2 — Biometrik login (FaceID / TouchID).
 * Supabase refresh_token ni qurilmada saqlaydi va keyingi kirishda
 * barmoq izi / yuz tasdiqdan keyin sessiyani tiklaydi.
 *
 * Faza 3 o'rnatish (Android Studio):
 *   npm i @aparajita/capacitor-biometric-auth && npx cap sync
 */
async function loadPlugin(): Promise<any | null> {
  if (!isNative()) return null;
  return (await import(/* @vite-ignore */ "@aparajita/capacitor-biometric-auth").catch(() => null)) ?? null;
}

/** Qurilmada biometrika mavjudligini tekshirish */
export async function isBiometricAvailable(): Promise<boolean> {
  const mod = await loadPlugin();
  if (!mod?.BiometricAuth) return false;
  try {
    const info = await mod.BiometricAuth.checkBiometry();
    return !!info.isAvailable;
  } catch {
    return false;
  }
}

/** Joriy sessiyani biometrika ostida saqlash (login muvaffaqiyatli bo'lgach) */
export async function enableBiometricLogin(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const rt = data.session?.refresh_token;
  if (!rt) return false;
  try {
    localStorage.setItem(CRED_KEY, rt);
    return true;
  } catch {
    return false;
  }
}

export function hasBiometricSession(): boolean {
  return !!localStorage.getItem(CRED_KEY);
}

export function disableBiometricLogin() {
  localStorage.removeItem(CRED_KEY);
}

/** Biometrika orqali kirish — barmoq izi/yuz so'raydi, so'ng sessiyani tiklaydi */
export async function biometricSignIn(): Promise<boolean> {
  const rt = localStorage.getItem(CRED_KEY);
  if (!rt) return false;

  const mod = await loadPlugin();
  if (!mod?.BiometricAuth) return false;

  try {
    await mod.BiometricAuth.authenticate({
      reason: "HammaBop'ga kirish",
      cancelTitle: "Bekor qilish",
      androidTitle: "Biometrik tasdiqlash",
      androidSubtitle: "Barmoq izi yoki yuzni tanish",
    });
  } catch {
    return false; // foydalanuvchi bekor qildi yoki muvaffaqiyatsiz
  }

  const { error } = await supabase.auth.refreshSession({ refresh_token: rt });
  if (error) {
    disableBiometricLogin();
    return false;
  }
  return true;
}
