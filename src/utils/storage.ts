/** Storage Manager — keshni tozalash va xotira hisobini ko'rsatish */

const VIDEO_CACHE = "hammabop-video-cache";

/** Taxminiy ishlatilgan xotira (MB) */
export async function getStorageUsage(): Promise<{ usedMB: number; quotaMB: number }> {
  try {
    if (navigator.storage?.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { usedMB: +(usage / 1048576).toFixed(1), quotaMB: +(quota / 1048576).toFixed(0) };
    }
  } catch {}
  return { usedMB: 0, quotaMB: 0 };
}

/**
 * Faqat og'ir video keshini va eski media'ni tozalaydi.
 * Auth/sessiya va savat ma'lumotlariga tegmaydi.
 */
export async function clearVideoCache(): Promise<number> {
  let freed = 0;

  // 1) CacheStorage — video cache'lari
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.includes("video") || key === VIDEO_CACHE) {
          await caches.delete(key);
          freed++;
        }
      }
    }
  } catch {}

  // 2) localStorage — faqat video/media bilan bog'liq kalitlar
  try {
    const remove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("video_") || k.startsWith("reel_") || k.startsWith("media_cache_"))) {
        remove.push(k);
      }
    }
    remove.forEach((k) => localStorage.removeItem(k));
    freed += remove.length;
  } catch {}

  return freed;
}
