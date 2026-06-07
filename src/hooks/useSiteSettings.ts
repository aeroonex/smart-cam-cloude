import { createContext, useContext, useCallback, useEffect, useState, createElement, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Settings = Record<string, string>;

interface SiteSettingsValue {
  settings: Settings;
  reload: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsValue>({ settings: {}, reload: async () => {} });

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({});

  const reload = useCallback(async () => {
    const { data } = await supabase.from("site_settings" as never).select("key, value");
    if (data) {
      const map: Settings = {};
      (data as { key: string; value: string }[]).forEach(r => { map[r.key] = r.value; });
      setSettings(map);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return createElement(SiteSettingsContext.Provider, { value: { settings, reload } }, children);
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
