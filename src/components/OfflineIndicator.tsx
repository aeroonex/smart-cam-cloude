import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** #3 — Internet uzilganda yuqorida ko'rinadigan native uslubdagi indikator */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-2 bg-neutral-800 py-1.5 text-xs font-medium text-white">
      <WifiOff className="h-3.5 w-3.5" />
      Internet yo'q — keshlangan ma'lumotlar ko'rsatilmoqda
    </div>
  );
}
