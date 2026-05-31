import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Currency = "UZS" | "USD" | "RUB";

type Rates = { USD: number; RUB: number }; // UZS per 1 unit

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Rates;
  /** UZS qiymatini tanlangan valyutada formatlaydi */
  format: (uzs: number) => string;
};

const STORAGE_KEY = "hammabop_currency";
const RATES_CACHE_KEY = "hammabop_rates";

// Zaxira kurslar (CBU yuklanmasa) — taxminiy
const FALLBACK_RATES: Rates = { USD: 12900, RUB: 145 };

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function loadCurrency(): Currency {
  if (typeof window === "undefined") return "UZS";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "USD" || v === "RUB" || v === "UZS" ? v : "UZS";
}

function loadCachedRates(): Rates {
  if (typeof window === "undefined") return FALLBACK_RATES;
  try {
    const raw = window.localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return FALLBACK_RATES;
    const parsed = JSON.parse(raw) as Rates;
    if (parsed?.USD && parsed?.RUB) return parsed;
  } catch { /* ignore */ }
  return FALLBACK_RATES;
}

const SYMBOL: Record<Currency, string> = { UZS: "so'm", USD: "$", RUB: "₽" };

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(loadCurrency);
  const [rates, setRates] = useState<Rates>(loadCachedRates);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    window.localStorage.setItem(STORAGE_KEY, c);
  }, []);

  // CBU dan jonli kurslarni olish
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/");
        if (!res.ok) return;
        const data = (await res.json()) as Array<{ Ccy: string; Rate: string }>;
        const usd = data.find((d) => d.Ccy === "USD");
        const rub = data.find((d) => d.Ccy === "RUB");
        const next: Rates = {
          USD: usd ? Number(usd.Rate) : FALLBACK_RATES.USD,
          RUB: rub ? Number(rub.Rate) : FALLBACK_RATES.RUB,
        };
        if (!cancelled && next.USD > 0 && next.RUB > 0) {
          setRates(next);
          window.localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(next));
        }
      } catch { /* zaxira kurslar bilan davom etamiz */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const format = useCallback(
    (uzs: number) => {
      const amount = Number(uzs) || 0;
      if (currency === "UZS") {
        return `${Math.round(amount).toLocaleString("uz-UZ")} so'm`;
      }
      const rate = currency === "USD" ? rates.USD : rates.RUB;
      const converted = rate > 0 ? amount / rate : 0;
      const formatted = converted.toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return currency === "USD" ? `$${formatted}` : `${formatted} ${SYMBOL.RUB}`;
    },
    [currency, rates],
  );

  const value = useMemo(
    () => ({ currency, setCurrency, rates, format }),
    [currency, setCurrency, rates, format],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
