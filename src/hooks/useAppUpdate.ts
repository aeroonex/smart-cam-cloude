import { useEffect, useState } from "react";

/** Joriy ilova versiyasi — har relizda oshiriladi (build vaqtida ham qo'yiladi) */
export const APP_VERSION = "1.0.0";

const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform();

type VersionInfo = {
  version: string;
  min_supported?: string;
  android_url?: string;
  notes?: string;
};

function cmp(a: string, b: string) {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

/**
 * #11 — In-App Updates. Fonda `version.json` ni tekshiradi va serverdagi
 * versiya yangiroq bo'lsa yangilash bannerini ko'rsatadi.
 */
export function useAppUpdate() {
  const [update, setUpdate] = useState<VersionInfo | null>(null);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const info: VersionInfo = await res.json();
        if (!active) return;
        if (cmp(info.version, APP_VERSION) > 0) {
          setUpdate(info);
          if (info.min_supported && cmp(info.min_supported, APP_VERSION) > 0) {
            setForced(true); // majburiy yangilash
          }
        }
      } catch {}
    };
    check();
    const id = setInterval(check, 30 * 60_000); // har 30 daqiqada
    return () => { active = false; clearInterval(id); };
  }, []);

  const installUpdate = () => {
    const url = update?.android_url;
    if (isNative() && url) {
      window.open(url, "_system");
    } else {
      window.location.reload();
    }
  };

  return { update, forced, installUpdate, dismiss: () => setUpdate(null) };
}
