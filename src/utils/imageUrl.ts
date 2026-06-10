/**
 * normalizeImageUrl — eski aigate.uz URL'larni Supabase Storage URL'larga
 * avtomatik aylantiradi (agar fayl nomi bir xil bo'lsa).
 *
 * Eski format: https://aigate.uz/uploads/products/1234_abc.jpg
 * Yangi format: https://<project>.supabase.co/storage/v1/object/public/product-media/products/1234_abc.jpg
 */
const SUPABASE_STORAGE =
  "https://vhbrbptcnkzkfdbxehgt.supabase.co/storage/v1/object/public/product-media";

const OLD_HOST_RE = /^https?:\/\/aigate\.uz\/uploads\/(.*)/;

export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  // Eski aigate.uz URL → Supabase Storage
  const m = url.match(OLD_HOST_RE);
  if (m) return `${SUPABASE_STORAGE}/${m[1]}`;

  return url;
}
