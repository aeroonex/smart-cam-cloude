import { useEffect, useState } from "react";
import {
  CheckCircle2, Phone, Printer, Truck, User, X, UserCheck,
} from "lucide-react";
import { BoxLoader } from "@/components/BoxLoader";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { statusMeta } from "@/constants";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  courier_name?: string | null;
  courier_phone?: string | null;
};
type OrderItem = { product_name: string; quantity: number; price: number };

const COLUMNS: { id: Order["status"]; label: string; color: string; dot: string }[] = [
  { id: "yangi",             label: "Yangi",         color: "bg-blue-50 border-blue-200",  dot: "bg-[#1d4f8a]" },
  { id: "qabul_qilindi",     label: "Qabul qilindi", color: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  { id: "yetkazilmoqda",     label: "Kuryerda",      color: "bg-blue-50 border-blue-200",       dot: "bg-blue-500" },
  { id: "mijoz_qabul_qildi", label: "Yakunlandi",    color: "bg-neutral-50 border-neutral-200", dot: "bg-neutral-400" },
];

function printInvoice(order: Order) {
  const items = (order.items as OrderItem[]) ?? [];
  const w = window.open("", "_blank", "width=700,height=900");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>Chek #${order.id.slice(0,8).toUpperCase()}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Courier New',monospace;padding:24px;color:#111}
      .hdr{text-align:center;border-bottom:2px dashed #ccc;padding-bottom:16px;margin-bottom:16px}
      .logo{font-size:22px;font-weight:900}.logo span{color:#1d4f8a}
      .meta{margin-bottom:16px;font-size:13px;line-height:2}
      table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}
      th{text-align:left;border-bottom:1px solid #ccc;padding:6px 4px;font-size:11px;text-transform:uppercase}
      td{padding:8px 4px;border-bottom:1px dotted #eee}
      .total{font-size:16px;font-weight:900;text-align:right;margin-top:8px}
      .courier{margin-top:12px;padding:10px;border:1px dashed #ccc;border-radius:8px;font-size:12px}
      .ftr{text-align:center;margin-top:20px;font-size:11px;color:#888;border-top:2px dashed #ccc;padding-top:12px}
      @media print{body{padding:8px}}
    </style></head><body>
    <div class="hdr">
      <div class="logo"><span>Hamma</span>Bop</div>
      <p style="font-size:11px;color:#888;margin-top:4px">hammabop.uz</p>
      <h2 style="margin-top:12px;font-size:15px">BUYURTMA CHEKI</h2>
      <p style="font-size:12px;color:#555">#${order.id.slice(0,8).toUpperCase()}</p>
    </div>
    <div class="meta">
      <p><b>Sana:</b> ${new Date(order.created_at).toLocaleString("uz-UZ")}</p>
      <p><b>Mijoz:</b> ${order.customer_name}</p>
      <p><b>Telefon:</b> ${order.customer_phone}</p>
      <p><b>Hudud:</b> ${order.customer_region}</p>
      <p><b>To'lov:</b> ${(order as Record<string,unknown>).payment_method ?? "Naqd"}</p>
    </div>
    ${order.courier_name ? `<div class="courier">
      🚚 <b>Kuryer:</b> ${order.courier_name}${order.courier_phone ? ` &nbsp;|&nbsp; 📞 ${order.courier_phone}` : ""}
    </div>` : ""}
    <table style="margin-top:12px">
      <thead><tr><th>Mahsulot</th><th>Soni</th><th>Narx</th><th>Jami</th></tr></thead>
      <tbody>${items.map(it => `<tr>
        <td>${it.product_name}</td><td>${it.quantity}</td>
        <td>${it.price.toLocaleString()} so'm</td>
        <td>${(it.price*it.quantity).toLocaleString()} so'm</td>
      </tr>`).join("")}</tbody>
    </table>
    <div class="total">JAMI: ${Number(order.total_amount).toLocaleString()} so'm</div>
    <div class="ftr"><p>HammaBop orqali xarid qilganingiz uchun rahmat!</p><p>@HammaBopSupport</p></div>
    <script>setTimeout(()=>{window.print()},300)</script>
    </body></html>`);
  w.document.close();
}

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [courierEditing, setCourierEditing] = useState<string | null>(null);
  const [courierDraft, setCourierDraft] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<Order["status"] | "all">("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  async function moveOrder(id: string, status: Order["status"]) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error("Status yangilanmadi."); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    toast.success(`Status: ${statusMeta[status].label}`);
  }

  function openCourierEdit(order: Order) {
    setCourierDraft({ name: order.courier_name ?? "", phone: order.courier_phone ?? "" });
    setCourierEditing(order.id);
  }

  async function saveCourier(orderId: string) {
    if (!courierDraft.name.trim()) { toast.error("Kuryer ismini kiriting."); return; }
    const { error } = await supabase.from("orders").update({
      courier_name: courierDraft.name.trim(),
      courier_phone: courierDraft.phone.trim() || null,
      status: "yetkazilmoqda",
    } as Record<string, unknown>).eq("id", orderId);
    if (error) { toast.error("Kuryer biriktirilmadi."); return; }
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, courier_name: courierDraft.name.trim(), courier_phone: courierDraft.phone.trim() || null, status: "yetkazilmoqda" }
        : o
    ));
    setCourierEditing(null);
    toast.success("Kuryer biriktirildi! Status → Kuryerda");
  }

  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const q = search.toLowerCase();
    const matchQ = !q || o.customer_name?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) || o.customer_phone?.includes(q);
    return matchStatus && matchQ;
  });

  if (loading) return <BoxLoader className="py-20" />;

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Mijoz nomi, telefon yoki ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-full sm:w-60 rounded-xl border-neutral-200"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filterStatus === "all" ? "bg-[#1d4f8a] text-white" : "bg-white border border-neutral-200 text-neutral-600"
            }`}
          >
            Barchasi ({orders.length})
          </button>
          {COLUMNS.map(col => (
            <button key={col.id}
              onClick={() => setFilterStatus(col.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filterStatus === col.id ? "bg-[#1d4f8a] text-white" : "bg-white border border-neutral-200 text-neutral-600"
              }`}
            >
              {col.label} ({orders.filter(o => o.status === col.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 items-start">
        {COLUMNS.map(col => {
          const colOrders = filtered.filter(o => o.status === col.id);
          return (
            <div
              key={col.id}
              className={`rounded-2xl border-2 p-3 min-h-[200px] transition-all ${col.color} ${
                draggingId ? "ring-2 ring-offset-1 ring-[#1d4f8a]/30" : ""
              }`}
              onDragOver={e => e.preventDefault()}
              onDrop={async () => {
                if (draggingId) { await moveOrder(draggingId, col.id); setDraggingId(null); }
              }}
            >
              {/* Column header */}
              <div className="mb-3 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <p className="font-bold text-neutral-800 text-sm">{col.label}</p>
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white/80 px-1.5 text-[10px] font-bold text-neutral-600 shadow-sm">
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {colOrders.length === 0 && (
                  <div className="py-6 text-center text-xs text-neutral-400 opacity-60">Buyurtma yo'q</div>
                )}
                {colOrders.map(order => {
                  const items = (order.items as OrderItem[]) ?? [];
                  const hasCourier = !!order.courier_name;
                  const isEditingCourier = courierEditing === order.id;

                  return (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={() => setDraggingId(order.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`cursor-grab rounded-xl bg-white p-3 shadow-sm border border-white active:cursor-grabbing hover:shadow-md transition ${
                        draggingId === order.id ? "opacity-40 scale-95" : ""
                      }`}
                    >
                      {/* ID + summa */}
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <p className="text-xs font-bold text-neutral-800">
                          #{order.id.slice(0,8).toUpperCase()}
                        </p>
                        <p className="text-xs font-bold text-[#1d4f8a] shrink-0">
                          {formatPrice(Number(order.total_amount))}
                        </p>
                      </div>

                      {/* Mijoz */}
                      <div className="space-y-0.5 mb-2">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-neutral-400 shrink-0" />
                          <p className="text-xs text-neutral-700 truncate">{order.customer_name}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-neutral-400 shrink-0" />
                          <p className="text-xs text-neutral-500">{order.customer_phone}</p>
                        </div>
                      </div>

                      {/* Kuryer ma'lumotlari (agar biriktirilgan bo'lsa) */}
                      {hasCourier && !isEditingCourier && (
                        <div
                          className="mb-2 flex items-start gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1.5 cursor-pointer hover:bg-blue-100 transition"
                          onClick={() => openCourierEdit(order)}
                          title="Kuryer ma'lumotlarini o'zgartirish"
                        >
                          <UserCheck className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-blue-700 truncate">{order.courier_name}</p>
                            {order.courier_phone && (
                              <p className="text-[10px] text-blue-500">{order.courier_phone}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Mahsulotlar */}
                      <div className="text-[10px] text-neutral-400 mb-2 space-y-0.5">
                        {items.slice(0,2).map((it, i) => (
                          <p key={i} className="truncate">· {it.product_name} ×{it.quantity}</p>
                        ))}
                        {items.length > 2 && <p>· va yana {items.length - 2} ta...</p>}
                      </div>

                      <p className="text-[10px] text-neutral-400 mb-2">
                        {new Date(order.created_at).toLocaleString("uz-UZ", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>

                      {/* Kuryer biriktirish formi */}
                      {isEditingCourier ? (
                        <div className="space-y-1.5 border-t border-neutral-100 pt-2">
                          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
                            Kuryer ma'lumotlari
                          </p>
                          <Input
                            placeholder="Kuryer ismi *"
                            className="h-7 text-xs rounded-lg"
                            value={courierDraft.name}
                            onChange={e => setCourierDraft(d => ({ ...d, name: e.target.value }))}
                            autoFocus
                          />
                          <Input
                            placeholder="Telefon raqami"
                            className="h-7 text-xs rounded-lg"
                            value={courierDraft.phone}
                            onChange={e => setCourierDraft(d => ({ ...d, phone: e.target.value }))}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => void saveCourier(order.id)}
                              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#1d4f8a] py-1.5 text-[10px] font-bold text-white hover:bg-[#164078] transition"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {hasCourier ? "Yangilash" : "Biriktirish"}
                            </button>
                            <button
                              onClick={() => setCourierEditing(null)}
                              className="rounded-lg bg-neutral-100 px-2.5 py-1.5 hover:bg-neutral-200 transition"
                            >
                              <X className="h-3 w-3 text-neutral-500" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5 border-t border-neutral-100 pt-2">
                          <button
                            onClick={() => openCourierEdit(order)}
                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold transition ${
                              hasCourier
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            }`}
                          >
                            <Truck className="h-3 w-3" />
                            {hasCourier ? "Kuryer ✓" : "Kuryer"}
                          </button>
                          <button
                            onClick={() => printInvoice(order)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-neutral-100 py-1.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-200 transition"
                          >
                            <Printer className="h-3 w-3" />Chek
                          </button>
                        </div>
                      )}

                      {/* Status selector */}
                      <select
                        value={order.status}
                        onChange={e => void moveOrder(order.id, e.target.value as Order["status"])}
                        className="mt-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[10px] outline-none focus:border-[#1d4f8a]"
                      >
                        {Object.entries(statusMeta).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl bg-white border border-neutral-100 py-16 text-center">
          <p className="text-neutral-400">Buyurtma topilmadi</p>
        </div>
      )}
    </div>
  );
}
