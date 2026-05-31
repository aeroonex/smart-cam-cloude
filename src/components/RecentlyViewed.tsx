import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

type Props = {
  products: Product[];
};

export function RecentlyViewed({ products }: Props) {
  const navigate = useNavigate();
  const { format: formatPrice } = useCurrency();

  if (products.length === 0) return null;

  return (
    <div className="mt-4 px-3">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-neutral-500" />
        <h3 className="text-sm font-bold text-neutral-700">Yaqinda ko'rilganlar</h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/product/${p.id}`)}
            className="shrink-0 flex flex-col rounded-xl border border-neutral-100 bg-white overflow-hidden hover:shadow-md transition"
            style={{ width: 100 }}
          >
            <div className="relative bg-neutral-50" style={{ height: 80 }}>
              {p.images?.[0] ? (
                <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-orange-50 text-2xl">📷</div>
              )}
            </div>
            <div className="p-1.5">
              <p className="line-clamp-1 text-[11px] text-neutral-700">{p.name}</p>
              <p className="text-[11px] font-bold text-[#EE7526]">{formatPrice(Number(p.price))}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
