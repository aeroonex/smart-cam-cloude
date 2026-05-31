import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquare, Package, Star, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Review = Database["public"]["Tables"]["product_reviews"]["Row"] & {
  users?: { full_name: string | null };
  products?: { name: string };
};

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("product_reviews")
      .select("*, users(full_name), products(name)")
      .order("created_at", { ascending: false });
    setReviews((data as Review[]) ?? []);
    setLoading(false);
  }

  async function deleteReview(id: string) {
    if (!confirm("Izohni o'chirishni tasdiqlaysizmi?")) return;
    await supabase.from("product_reviews").delete().eq("id", id);
    setReviews(prev => prev.filter(r => r.id !== id));
    toast.success("O'chirildi.");
  }

  const displayed = filterRating > 0
    ? reviews.filter(r => r.rating === filterRating)
    : reviews;

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const ratingDist = [5,4,3,2,1].map(r => ({
    r, count: reviews.filter(rv => rv.rating === r).length,
  }));

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[#EE7526]" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-neutral-900">{avgRating}</p>
              <div className="flex justify-center gap-0.5 mt-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-4 w-4 ${s <= Number(avgRating) ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`} />
                ))}
              </div>
              <p className="text-xs text-neutral-400 mt-1">{reviews.length} ta izoh</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {ratingDist.map(({ r, count }) => {
                const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                return (
                  <div key={r} className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold w-3 text-neutral-500">{r}</span>
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                    <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-neutral-400 w-6">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-neutral-100 p-5 shadow-sm">
          <h3 className="mb-3 font-bold text-neutral-900">Statistika</h3>
          <div className="space-y-2 text-sm text-neutral-600">
            <div className="flex justify-between">
              <span>5 ⭐ izohlar</span>
              <span className="font-semibold text-emerald-600">{reviews.filter(r => r.rating === 5).length}</span>
            </div>
            <div className="flex justify-between">
              <span>4 ⭐ izohlar</span>
              <span className="font-semibold text-blue-600">{reviews.filter(r => r.rating === 4).length}</span>
            </div>
            <div className="flex justify-between">
              <span>3 ⭐ va pastroq</span>
              <span className="font-semibold text-red-500">{reviews.filter(r => r.rating <= 3).length}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-100 pt-2 font-semibold">
              <span>Jami</span>
              <span className="text-neutral-900">{reviews.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterRating(0)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            filterRating === 0 ? "bg-[#EE7526] text-white" : "bg-white border border-neutral-200 text-neutral-600"
          }`}
        >
          Barchasi ({reviews.length})
        </button>
        {[5,4,3,2,1].map(r => (
          <button
            key={r}
            onClick={() => setFilterRating(r)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filterRating === r ? "bg-[#EE7526] text-white" : "bg-white border border-neutral-200 text-neutral-600"
            }`}
          >
            {r} <Star className="h-3 w-3 fill-current" />
            ({reviews.filter(rv => rv.rating === r).length})
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {displayed.length === 0 ? (
        <div className="rounded-2xl bg-white border border-neutral-100 py-16 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-neutral-200" />
          <p className="text-neutral-400">Izoh topilmadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(review => (
            <div key={review.id}
              className="flex items-start gap-4 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm hover:shadow-md transition">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-neutral-900 text-sm">
                    {review.users?.full_name ?? "Foydalanuvchi"}
                  </p>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-3.5 w-3.5 ${
                        s <= review.rating ? "fill-amber-400 text-amber-400" : "text-neutral-200"
                      }`} />
                    ))}
                  </div>
                  <span className="text-xs text-neutral-400">
                    {new Date(review.created_at).toLocaleDateString("uz-UZ")}
                  </span>
                  {review.rating >= 4 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Ijobiy
                    </span>
                  )}
                  {review.rating <= 2 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                      Salbiy
                    </span>
                  )}
                </div>
                {review.products?.name && (
                  <Link to={`/product/${review.product_id}`} target="_blank"
                    className="mb-2 flex items-center gap-1 text-xs text-[#EE7526] hover:underline">
                    <Package className="h-3 w-3" />{review.products.name}
                  </Link>
                )}
                {review.comment && (
                  <p className="text-sm text-neutral-600 leading-relaxed">{review.comment}</p>
                )}
              </div>
              <button onClick={() => void deleteReview(review.id)}
                className="shrink-0 rounded-full p-1.5 text-red-400 hover:bg-red-50 transition">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
