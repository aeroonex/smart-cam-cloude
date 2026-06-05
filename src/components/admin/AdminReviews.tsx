import { useEffect, useState } from "react";
import { CheckCircle2, Clock, MessageSquare, Package, Star, Trash2, XCircle } from "lucide-react";
import { BoxLoader } from "@/components/BoxLoader";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Review = Database["public"]["Tables"]["product_reviews"]["Row"] & {
  users?: { full_name: string | null };
  products?: { name: string };
};

type TabType = "pending" | "approved" | "rejected";

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("pending");

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

  async function approve(id: string) {
    await supabase.from("product_reviews").update({ status: "approved", is_approved: true }).eq("id", id);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: "approved", is_approved: true } : r));
    toast.success("Izoh tasdiqlandi va e'lon qilindi.");
  }

  async function reject(id: string) {
    await supabase.from("product_reviews").update({ status: "rejected", is_approved: false }).eq("id", id);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: "rejected", is_approved: false } : r));
    toast.success("Izoh rad etildi.");
  }

  async function deleteReview(id: string) {
    if (!confirm("Izohni o'chirishni tasdiqlaysizmi?")) return;
    await supabase.from("product_reviews").delete().eq("id", id);
    setReviews(prev => prev.filter(r => r.id !== id));
    toast.success("O'chirildi.");
  }

  const pending = reviews.filter(r => r.status === "pending");
  const approved = reviews.filter(r => r.status === "approved");
  const rejected = reviews.filter(r => r.status === "rejected");
  const displayed = tab === "pending" ? pending : tab === "approved" ? approved : rejected;

  const avgRating = approved.length
    ? (approved.reduce((s, r) => s + r.rating, 0) / approved.length).toFixed(1)
    : "0.0";

  const ratingDist = [5,4,3,2,1].map(r => ({
    r, count: approved.filter(rv => rv.rating === r).length,
  }));

  if (loading) return <BoxLoader className="py-20" />;

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
              <p className="text-xs text-neutral-400 mt-1">{approved.length} ta tasdiqlangan</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {ratingDist.map(({ r, count }) => {
                const pct = approved.length ? Math.round((count / approved.length) * 100) : 0;
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
          <h3 className="mb-3 font-bold text-neutral-900">Moderatsiya holati</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-neutral-600">Kutilmoqda</span>
              </div>
              <span className="font-bold text-amber-600">{pending.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-neutral-600">Tasdiqlangan</span>
              </div>
              <span className="font-bold text-emerald-600">{approved.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-neutral-600">Rad etilgan</span>
              </div>
              <span className="font-bold text-red-500">{rejected.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: "pending" as TabType, label: "Kutilmoqda", count: pending.length, color: "amber" },
          { id: "approved" as TabType, label: "Tasdiqlangan", count: approved.length, color: "emerald" },
          { id: "rejected" as TabType, label: "Rad etilgan", count: rejected.length, color: "red" },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-[#1d4f8a] text-white shadow-sm"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
              tab === t.id ? "bg-white/30 text-white" : "bg-neutral-100 text-neutral-500"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Pending alert */}
      {tab === "pending" && pending.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-amber-800">
          <b>{pending.length} ta izoh</b> sizning tasdiqlashingizni kutmoqda. Tasdiqlagan izohlar mahsulot sahifasida ko'rinadi.
        </div>
      )}

      {/* List */}
      {displayed.length === 0 ? (
        <div className="rounded-2xl bg-white border border-neutral-100 py-16 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-neutral-200" />
          <p className="text-neutral-400">
            {tab === "pending" ? "Kutilayotgan izoh yo'q" : tab === "approved" ? "Tasdiqlangan izoh yo'q" : "Rad etilgan izoh yo'q"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(review => (
            <div key={review.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                review.status === "pending" ? "border-amber-100" :
                review.status === "approved" ? "border-emerald-100" : "border-red-100 opacity-70"
              }`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
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
                    {review.status === "pending" && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        <Clock className="h-3 w-3" />Kutilmoqda
                      </span>
                    )}
                    {review.status === "approved" && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />Tasdiqlangan
                      </span>
                    )}
                    {review.status === "rejected" && (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                        <XCircle className="h-3 w-3" />Rad etilgan
                      </span>
                    )}
                  </div>
                  {review.products?.name && (
                    <Link to={`/product/${review.product_id}`} target="_blank"
                      className="mb-2 flex items-center gap-1 text-xs text-[#1d4f8a] hover:underline">
                      <Package className="h-3 w-3" />{review.products.name}
                    </Link>
                  )}
                  {review.comment && (
                    <p className="text-sm text-neutral-600 leading-relaxed">{review.comment}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  {review.status === "pending" && (
                    <>
                      <button
                        onClick={() => void approve(review.id)}
                        className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />Tasdiqlash
                      </button>
                      <button
                        onClick={() => void reject(review.id)}
                        className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                      >
                        <XCircle className="h-3.5 w-3.5" />Rad etish
                      </button>
                    </>
                  )}
                  {review.status === "approved" && (
                    <button
                      onClick={() => void reject(review.id)}
                      className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100 transition"
                    >
                      <XCircle className="h-3.5 w-3.5" />Rad etish
                    </button>
                  )}
                  {review.status === "rejected" && (
                    <button
                      onClick={() => void approve(review.id)}
                      className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />Tasdiqlash
                    </button>
                  )}
                  <button onClick={() => void deleteReview(review.id)}
                    className="flex items-center justify-center rounded-full p-1.5 text-red-400 hover:bg-red-50 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
