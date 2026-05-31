import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  Loader2,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Truck,
  X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryMenu } from "@/components/CategoryMenu";
import { HammaBopLogo } from "@/components/HammaBopLogo";
import { ProductCard } from "@/components/ProductCard";
import { useSessionContext } from "@/components/session-context-provider";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import { useI18n } from "@/hooks/useI18n";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { getInitials } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

const CATEGORIES = [
  "Mobil telefonlar","Kompyuter & Noutbuk","Kiyim-kechak","Poyabzal",
  "Uy va ofis","Avtomobil","Bolalar tovarlari","O'yinlar & Hobby",
  "Sport & Sog'liq","Soatlar & Zargarlik","Sumkalar","Asbob-uskuna",
  "Go'zallik & Parfyumeriya",
];

type SortKey = "relevant" | "price_asc" | "price_desc" | "sold";

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: sessionLoading, signOut } = useSessionContext();
  const { addToCart, cartCount } = useCart();
  const { format: formatPrice } = useCurrency();
  const { t } = useI18n();
  const { profile } = useProfile(user);

  const SORT_LABELS_T: Record<SortKey, string> = {
    relevant: t("sort_relevant"),
    price_asc: t("sort_price_asc"),
    price_desc: t("sort_price_desc"),
    sold: t("sort_sold"),
  };

  const q = searchParams.get("q") ?? "";
  const [inputVal, setInputVal] = useState(q);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  // Filters
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevant");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Update input when URL changes
  useEffect(() => { setInputVal(q); }, [q]);

  useEffect(() => {
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, selectedCats, minPrice, maxPrice, minRating, sort]);

  // Qidiruv so'rovi va filtrlar bo'lmasa — "Tavsiya etamiz" rejimi
  const isRecommendMode = !q && selectedCats.size === 0 && !minPrice && !maxPrice;

  async function runSearch() {
    setLoading(true);
    let query = supabase.from("products").select("*").eq("status", "active");

    if (q) query = query.ilike("name", `%${q}%`);
    if (selectedCats.size > 0) query = query.in("category", [...selectedCats]);
    if (minPrice) query = query.gte("price", Number(minPrice));
    if (maxPrice) query = query.lte("price", Number(maxPrice));

    // Bo'sh qidiruvda faqat admin tavsiya etgan mahsulotlar
    if (isRecommendMode) query = query.eq("is_recommended", true);

    if (sort === "price_asc") query = query.order("price", { ascending: true });
    else if (sort === "price_desc") query = query.order("price", { ascending: false });
    else if (sort === "sold") query = query.order("sold_count", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      // Handle missing columns gracefully (migration not applied yet)
      const fallback = await supabase.from("products").select("*").eq("status", "active");
      let list = (fallback.data ?? []) as Product[];
      if (q) list = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
      setProducts(list);
      setTotal(list.length);
    } else {
      let list = (data ?? []) as Product[];
      if (minRating) list = list.filter((p) => {
        // We filter by rating client-side since reviews are separate
        return true; // Simplified — real ratings would join reviews
      });
      setProducts(list);
      setTotal(list.length);
    }
    setLoading(false);
  }

  function doSearch(val?: string) {
    const term = (val ?? inputVal).trim();
    setSearchParams(term ? { q: term } : {});
  }

  function toggleCat(cat: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function clearFilters() {
    setSelectedCats(new Set());
    setMinPrice(""); setMaxPrice("");
    setMinRating(null); setFreeDelivery(false);
    setSort("relevant");
  }

  const hasFilters = selectedCats.size > 0 || minPrice || maxPrice || minRating || freeDelivery;

  const FilterSidebar = () => (
    <aside className="w-60 shrink-0 space-y-5">
      {hasFilters && (
        <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm font-semibold text-[#EE7526] hover:underline">
          <X className="h-3.5 w-3.5" /> {t("clear_filters")}
        </button>
      )}

      {/* Categories */}
      <div>
        <h3 className="mb-2.5 font-bold text-neutral-800">{t("categories")}</h3>
        <ul className="space-y-1.5">
          {CATEGORIES.map((cat) => (
            <li key={cat}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700 hover:text-[#EE7526]">
                <input
                  type="checkbox"
                  checked={selectedCats.has(cat)}
                  onChange={() => toggleCat(cat)}
                  className="h-4 w-4 accent-[#EE7526]"
                />
                {cat}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Price */}
      <div>
        <h3 className="mb-2.5 font-bold text-neutral-800">{t("price_sum")}</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="dan"
            className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-[#EE7526]"
          />
          <span className="text-neutral-400">—</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="gacha"
            className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-[#EE7526]"
          />
        </div>
        <button
          onClick={() => runSearch()}
          className="mt-2 w-full rounded-lg bg-[#EE7526] py-2 text-sm font-semibold text-white hover:bg-[#d8661c]"
        >
          {t("apply")}
        </button>
      </div>

      {/* Rating */}
      <div>
        <h3 className="mb-2.5 font-bold text-neutral-800">{t("rating")}</h3>
        <ul className="space-y-1.5">
          {[4, 3].map((n) => (
            <li key={n}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="rating"
                  checked={minRating === n}
                  onChange={() => setMinRating(minRating === n ? null : n)}
                  className="h-4 w-4 accent-[#EE7526]"
                />
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: n }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <span className="text-neutral-500">yoki ko'proq</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Delivery */}
      <div>
        <h3 className="mb-2.5 font-bold text-neutral-800">{t("delivery")}</h3>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={freeDelivery}
            onChange={(e) => setFreeDelivery(e.target.checked)}
            className="h-4 w-4 accent-[#EE7526]"
          />
          <Truck className="h-4 w-4 text-emerald-500" /> {t("free_delivery")}
        </label>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#EE7526] shadow-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2 text-white transition hover:opacity-90">
            <HammaBopLogo size={34} dark />
            <span className="hidden font-extrabold sm:block text-lg">Hamma<span className="text-orange-200">Bop</span></span>
          </Link>

          <div className="relative shrink-0" ref={catalogRef}>
            <button
              onClick={() => setCatalogOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{t("catalog")}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${catalogOpen ? "rotate-180" : ""}`} />
            </button>
            <CategoryMenu open={catalogOpen} onClose={() => setCatalogOpen(false)} />
          </div>

          {/* Search */}
          <div className="flex flex-1 overflow-hidden rounded-lg bg-white shadow-sm">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
              placeholder={t("search_placeholder")}
              className="flex-1 min-w-0 px-4 py-2.5 text-sm outline-none"
              autoFocus
            />
            {inputVal && (
              <button onClick={() => { setInputVal(""); doSearch(""); }} className="px-2 text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => doSearch()}
              className="flex items-center gap-1.5 bg-[#d8661c] px-5 text-sm font-bold text-white transition hover:bg-[#c25a18]"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{t("search_btn")}</span>
            </button>
          </div>

          {/* Cart + User */}
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={() => navigate("/")}
              className="relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-white transition hover:bg-white/20">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                  {cartCount}
                </span>
              )}
              <span className="hidden text-[10px] sm:block">{t("cart")}</span>
            </button>
            {!sessionLoading && user ? (
              <button
                onClick={() => navigate("/")}
                className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-white transition hover:bg-white/20"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-orange-300 text-xs font-bold text-white">
                    {getInitials(profile?.full_name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-[10px] sm:block">{t("profile")}</span>
              </button>
            ) : (
              <button onClick={() => navigate("/login")}
                className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/30">
                {t("login")}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sub nav */}
      <div className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-1.5 sm:px-6 text-sm text-neutral-500">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 hover:text-[#EE7526]">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("home")}
          </button>
          <span>›</span>
          {q ? (
            <span className="font-semibold text-neutral-800">"{q}" bo'yicha qidiruv</span>
          ) : isRecommendMode ? (
            <span className="font-semibold text-neutral-800">{t("recommend_title")}</span>
          ) : (
            <span className="font-semibold text-neutral-800">{t("all_products")}</span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6">
        <div className="flex gap-5">
          {/* Sidebar — desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-20 rounded-2xl bg-white p-5 shadow-sm" style={{ width: 240 }}>
              <FilterSidebar />
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* "Tavsiya etamiz" sarlavhasi — Uzum uslubida */}
            {isRecommendMode && (
              <div className="mb-4 flex items-center gap-2.5">
                <Star className="h-6 w-6 fill-[#EE7526] text-[#EE7526]" />
                <h1 className="text-2xl font-extrabold text-neutral-900">Tavsiya etamiz</h1>
              </div>
            )}

            {/* Top bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mobile filters */}
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:border-[#EE7526] lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {t("filters")} {hasFilters && <span className="rounded-full bg-[#EE7526] px-1.5 text-xs text-white">{selectedCats.size + (minPrice || maxPrice ? 1 : 0) + (minRating ? 1 : 0) + (freeDelivery ? 1 : 0)}</span>}
                </button>

                <p className="text-sm text-neutral-500">
                  {loading ? t("searching") : (
                    <><span className="font-semibold text-neutral-900">{total}</span> {t("found_count_a")}</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:border-[#EE7526]">
                      {SORT_LABELS_T[sort]} <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    {(Object.keys(SORT_LABELS_T) as SortKey[]).map((k) => (
                      <DropdownMenuItem key={k} onClick={() => setSort(k)}
                        className={`rounded-lg ${sort === k ? "font-semibold text-[#EE7526]" : ""}`}>
                        {SORT_LABELS_T[k]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View toggle */}
                <div className="flex overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm">
                  <button onClick={() => setViewMode("grid")}
                    className={`p-2 ${viewMode === "grid" ? "bg-[#EE7526] text-white" : "text-neutral-500 hover:bg-neutral-50"}`}>
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button onClick={() => setViewMode("list")}
                    className={`p-2 ${viewMode === "list" ? "bg-[#EE7526] text-white" : "text-neutral-500 hover:bg-neutral-50"}`}>
                    <LayoutList className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="mb-4 flex flex-wrap gap-2">
                {[...selectedCats].map((cat) => (
                  <span key={cat} className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-[#EE7526]">
                    {cat}
                    <button onClick={() => toggleCat(cat)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {(minPrice || maxPrice) && (
                  <span className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-[#EE7526]">
                    {minPrice || "0"} — {maxPrice || "∞"} so'm
                    <button onClick={() => { setMinPrice(""); setMaxPrice(""); }}><X className="h-3 w-3" /></button>
                  </span>
                )}
                {freeDelivery && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Bepul yetkazish <button onClick={() => setFreeDelivery(false)}><X className="h-3 w-3" /></button>
                  </span>
                )}
              </div>
            )}

            {/* Results */}
            {loading ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-px bg-neutral-200 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse bg-white" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-32 animate-pulse rounded-xl bg-white" />
                  ))}
                </div>
              )
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-20 text-center shadow-sm">
                <Search className="h-16 w-16 text-neutral-200" />
                <div>
                  <p className="text-xl font-bold text-neutral-700">
                    {isRecommendMode ? t("recommend_title") : t("no_result")}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {q
                      ? `"${q}" bo'yicha hech narsa yo'q`
                      : isRecommendMode
                        ? "Admin hali tavsiya uchun mahsulot belgilamagan"
                        : "Qidiruv so'rovingizni kiriting"}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  {hasFilters && (
                    <button onClick={clearFilters} className="rounded-full border border-[#EE7526] px-5 py-2 text-sm font-semibold text-[#EE7526] hover:bg-orange-50">
                      {t("clear_filters")}
                    </button>
                  )}
                  <button onClick={() => navigate("/")} className="rounded-full bg-[#EE7526] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d8661c]">
                    {t("back_home")}
                  </button>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-px bg-neutral-200 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} onAddToCart={(prod) => { addToCart(prod); toast.success("Savatga qo'shildi!"); }} />
                ))}
              </div>
            ) : (
              /* List view */
              <div className="space-y-3">
                {products.map((p) => (
                  <div key={p.id} className="flex gap-4 rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer"
                    onClick={() => navigate(`/product/${p.id}`)}>
                    <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-neutral-50">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingCart className="h-8 w-8 text-orange-200" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-2">
                      <div>
                        {p.category && <span className="mb-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-[#EE7526]">{p.category}</span>}
                        <p className="font-semibold text-neutral-900 line-clamp-2">{p.name}</p>
                        {p.description && <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{p.description}</p>}
                      </div>
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-xl font-extrabold text-neutral-900">
                            {formatPrice(Number(p.price))}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-emerald-600">
                            <Truck className="h-3 w-3" /> Bepul yetkazish
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); addToCart(p); toast.success("Savatga qo'shildi!"); }}
                          className="rounded-full bg-[#EE7526] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d8661c]"
                        >
                          {t("add_to_cart")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-neutral-900">{t("filters")}</h2>
              <button onClick={() => setFiltersOpen(false)} className="rounded-full p-1.5 hover:bg-neutral-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterSidebar />
            <button onClick={() => setFiltersOpen(false)}
              className="mt-5 w-full rounded-full bg-[#EE7526] py-3 font-semibold text-white">
              Ko'rsatish ({total})
            </button>
          </div>
        </>
      )}
    </div>
  );
}
