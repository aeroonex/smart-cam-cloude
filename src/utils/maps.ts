import { haptic } from "@/utils/haptic";

const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform();

export type GeoPoint = { lat: number; lng: number; label?: string };

/**
 * Kuryer uchun — native navigatorni (Yandex/Google Maps) "Deep Link" orqali
 * ochadi va manzilga yo'nalish chizadi. Web da Google Maps brauzerda ochiladi.
 */
export async function openNavigation(dest: GeoPoint, from?: GeoPoint) {
  await haptic.medium();
  const { lat, lng, label } = dest;

  if (isNative()) {
    // Yandex Navi deep-link (O'zbekistonda eng mashhur)
    const yandex = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lng}`;
    // Google Maps universal geo URI (yo'nalish bilan)
    const gmaps = from
      ? `google.navigation:q=${lat},${lng}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label ?? "Manzil")})`;

    // Avval Yandex, ishlamasa Google
    tryOpen(yandex, () => tryOpen(gmaps, () => openWebMaps(dest, from)));
    return;
  }

  openWebMaps(dest, from);
}

function tryOpen(uri: string, onFail: () => void) {
  const timer = setTimeout(onFail, 1200);
  const onBlur = () => clearTimeout(timer);
  window.addEventListener("blur", onBlur, { once: true });
  try {
    window.location.href = uri;
  } catch {
    clearTimeout(timer);
    onFail();
  }
}

function openWebMaps(dest: GeoPoint, from?: GeoPoint) {
  const origin = from ? `&origin=${from.lat},${from.lng}` : "";
  const url = `https://www.google.com/maps/dir/?api=1${origin}&destination=${dest.lat},${dest.lng}&travelmode=driving`;
  window.open(url, "_blank", "noopener,noreferrer");
}
