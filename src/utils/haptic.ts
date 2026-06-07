/** Qurilmada haptik vibratsiya (Android + ba'zi brauzerlarda ishlaydi) */
function vibe(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // silent — ba'zi qurilmalar qo'llab-quvvatlamaydi
  }
}

export const haptic = {
  /** Yengil teginish — tugma bosilganda */
  light:   () => vibe(8),
  /** O'rtacha — muhim harakatlar */
  medium:  () => vibe(18),
  /** Kuchli — ogohlantirish, xato */
  heavy:   () => vibe(35),
  /** Muvaffaqiyat — buyurtma, saqlash */
  success: () => vibe([10, 60, 15]),
  /** Xato — tekshiruvdan o'tmadi */
  error:   () => vibe([30, 80, 30, 80, 30]),
  /** Tab almashtirish */
  tab:     () => vibe(6),
  /** Tanlash (chip, radio) */
  select:  () => vibe(12),
  /** Uzun bosish */
  long:    () => vibe([0, 50, 30]),
};
