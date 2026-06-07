import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_name:       string;
  site_name_part1: string;
  site_name_part2: string;
  brand_color:     string;
  brand_color2:    string;
  logo_url:        string;
  tagline:         string;
  support_phone:   string;
  support_telegram:string;
  footer_text:     string;
};

const DEFAULTS: SiteSettings = {
  site_name:        "HammaBop",
  site_name_part1:  "Hamma",
  site_name_part2:  "Bop",
  brand_color:      "#1d4f8a",
  brand_color2:     "#EE7526",
  logo_url:         "",
  tagline:          "O'zbekistonning eng qulay bozori",
  support_phone:    "+998 90 000 00 00",
  support_telegram: "https://t.me/hammabop_bot",
  footer_text:      "© 2025 HammaBop. Barcha huquqlar himoyalangan.",
};

const Ctx = createContext<{
  settings: SiteSettings;
  reload: () => void;
}>({ settings: DEFAULTS, reload: () => {} });

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);

  async function load() {
    const { data } = await supabase.from("site_settings" as never).select("key,value");
    if (!data) return;
    const map: Partial<SiteSettings> = {};
    for (const row of data as { key: string; value: string }[]) {
      (map as Record<string, string>)[row.key] = row.value ?? "";
    }
    setSettings({ ...DEFAULTS, ...map });
  }

  useEffect(() => { load(); }, []);

  // Apply brand_color as CSS variable globally
  useEffect(() => {
    document.documentElement.style.setProperty("--brand", settings.brand_color);
    document.documentElement.style.setProperty("--brand2", settings.brand_color2);
    // Update page title
    document.title = settings.site_name;
  }, [settings.brand_color, settings.brand_color2, settings.site_name]);

  return (
    <Ctx.Provider value={{ settings, reload: load }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSiteSettings() {
  return useContext(Ctx);
}
