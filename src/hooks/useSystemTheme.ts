import { useEffect } from "react";

/**
 * #9 — Qurilma tizimining (Android/iOS) Dark/Light rejimini avtomat aniqlaydi
 * va <html> ga `dark` klassini qo'shadi/oladi. UI elementlariga tegmaydi —
 * faqat `dark:` Tailwind variantlari uchun zamin tayyorlaydi.
 */
export function useSystemTheme() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = (isDark: boolean) => {
      const root = document.documentElement;
      root.classList.toggle("dark", isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    };

    apply(mq.matches);
    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
}
