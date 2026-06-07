import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Bell, Briefcase, Building2, Camera, ChevronDown,
  ChevronRight, ChevronUp, Copy, Download, Gift, HandshakeIcon,
  Heart, HelpCircle, Home, LayoutDashboard, LogOut, Mail, MapPin,
  Package, Pencil, Phone, Save, ShoppingBag, ShoppingCart,
  Star, UserRound, Wallet, X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSessionContext } from "@/components/session-context-provider";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/hooks/useWallet";
import { useOrders } from "@/hooks/useOrders";
import { useWishlist } from "@/hooks/useWishlist";
import { useI18n } from "@/hooks/useI18n";
import { getInitials } from "@/lib/format";
import { regions } from "@/constants";
import { toast } from "sonner";
import type { Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

/* ─── i18n labels ─────────────────────────────────────────── */
const L = {
  uz: {
    profile: "Kabinet",
    guest_title: "Profilga kiring",
    guest_sub: "Buyurtmalar va bonuslar uchun",
    login_btn: "Kirish",
    orders: "Buyurtmalar",
    wishlist: "Saralangan",
    bonus: "Bonus so'm",
    edit_profile: "Profilni tahrirlash",
    full_name: "Ism-familiya",
    phone: "Telefon",
    region: "Viloyat / Shahar",
    choose_region: "Hududni tanlang",
    save: "Saqlash",
    cancel: "Bekor",
    saving: "Saqlanmoqda...",
    my_orders: "Buyurtmalarim",
    my_wishlist: "Saqlanganlar",
    pickup: "Topshirish punkti",
    account_services: "Hisob va xizmatlar",
    faq: "Savol-javoblar",
    contact: "Biz bilan bog'lanish",
    app: "HammaBop ilovasi",
    download: "yuklab olish",
    language: "Sayt tili",
    about_us: "Biz haqimizda",
    pickup_points: "Topshirish punktlari",
    vacancies: "Vakansiyalar",
    partners: "Hamkorlarga",
    sell_with_us: "HammaBop da soting",
    seller_cabinet: "Sotuvchi kabinetiga kirish",
    open_pickup: "Topshirish punktini ochish",
    referral: "Do'stlarni taklif qiling",
    referral_sub: "Har bir do'st uchun 5 000 so'm bonus",
    referral_code: "Referal kodingiz",
    copy: "Nusxalash",
    copied: "Nusxalandi!",
    notifications: "Xabarlar",
    no_notifications: "Yangi xabarlar yo'q.",
    admin_panel: "Admin panel",
    logout: "Chiqish",
    version: "HammaBop v1.0",
    active_orders: "ta faol buyurtma",
    wallet_balance: "Hamyon",
    cashback: "Cashback",
    profile_saved: "Profil saqlandi!",
    profile_error: "Barcha maydonlarni to'ldiring",
    home: "Bosh sahifa",
    catalog: "Katalog",
    cart: "Savat",
    saved: "Saralangan",
    cabinet: "Kabinet",
  },
  ru: {
    profile: "Кабинет",
    guest_title: "Войдите в профиль",
    guest_sub: "Для заказов и бонусов",
    login_btn: "Войти",
    orders: "Заказы",
    wishlist: "Избранное",
    bonus: "Бонус сум",
    edit_profile: "Редактировать профиль",
    full_name: "Имя и фамилия",
    phone: "Телефон",
    region: "Регион / Город",
    choose_region: "Выберите регион",
    save: "Сохранить",
    cancel: "Отмена",
    saving: "Сохранение...",
    my_orders: "Мои заказы",
    my_wishlist: "Избранное",
    pickup: "Пункт выдачи",
    account_services: "Аккаунт и услуги",
    faq: "Вопросы и ответы",
    contact: "Связаться с нами",
    app: "Приложение HammaBop",
    download: "скачать",
    language: "Язык сайта",
    about_us: "О нас",
    pickup_points: "Пункты выдачи",
    vacancies: "Вакансии",
    partners: "Партнёрам",
    sell_with_us: "Продавать на HammaBop",
    seller_cabinet: "Войти в кабинет продавца",
    open_pickup: "Открыть пункт выдачи",
    referral: "Пригласить друзей",
    referral_sub: "5 000 сум бонус за каждого друга",
    referral_code: "Ваш реферальный код",
    copy: "Копировать",
    copied: "Скопировано!",
    notifications: "Уведомления",
    no_notifications: "Нет новых уведомлений.",
    admin_panel: "Админ-панель",
    logout: "Выйти",
    version: "HammaBop v1.0",
    active_orders: "активных заказов",
    wallet_balance: "Кошелёк",
    cashback: "Кэшбэк",
    profile_saved: "Профиль сохранён!",
    profile_error: "Заполните все поля",
    home: "Главная",
    catalog: "Каталог",
    cart: "Корзина",
    saved: "Избранное",
    cabinet: "Кабинет",
  },
} as const;

type Section = "about" | "partner" | "referral" | "notify" | null;

/* ─── neumorphic radio tab styles (injected once) ─────────── */
const radioCSS = `
.radio-inputs {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  border-radius: 1rem;
  background: linear-gradient(145deg,#e6e6e6,#ffffff);
  box-shadow: 5px 5px 15px rgba(0,0,0,.15),-5px -5px 15px rgba(255,255,255,.8);
  padding: 0.4rem;
  gap: 0.4rem;
  font-size: 13px;
}
.radio-inputs .radio { flex:1 1 auto; text-align:center; position:relative; }
.radio-inputs .radio input { display:none; }
.radio-inputs .radio .name {
  display:flex; cursor:pointer; align-items:center; justify-content:center;
  border-radius:0.7rem; border:none; padding:0.55rem 0;
  color:#2d3748; font-weight:500; font-family:inherit;
  background:linear-gradient(145deg,#ffffff,#e6e6e6);
  box-shadow:3px 3px 6px rgba(0,0,0,.1),-3px -3px 6px rgba(255,255,255,.7);
  transition:all .2s ease; overflow:hidden; user-select:none;
}
.radio-inputs .radio input:checked + .name {
  background:linear-gradient(145deg,#1d4f8a,#163e70);
  color:white; font-weight:600;
  box-shadow:inset 2px 2px 5px rgba(0,0,0,.25),inset -2px -2px 5px rgba(255,255,255,.08),3px 3px 8px rgba(29,79,138,.3);
  transform:translateY(2px);
  animation: rb-select .3s cubic-bezier(.4,0,.2,1);
}
.radio-inputs .radio:hover .name {
  background:linear-gradient(145deg,#f0f0f0,#ffffff);
  transform:translateY(-1px);
}
.radio-inputs .radio:hover input:checked + .name { transform:translateY(1px); }
@keyframes rb-select {
  0%  { transform:scale(.95) translateY(2px); }
  50% { transform:scale(1.04) translateY(-1px); }
  100%{ transform:scale(1) translateY(2px); }
}
`;

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useSessionContext();
  const { profile, form, setForm, saving, save } = useProfile(user);
  const { cashbackBalance, walletBalance, referralCode, ensureReferralCode } = useWallet(user);
  const { orders: ordersRaw } = useOrders(user);
  const { wishlistIds: wishlistRaw } = useWishlist();
  const { lang, setLang } = useI18n();
  const l = L[lang];

  const orders = ordersRaw ?? [];
  const wishlist = wishlistRaw ?? [] as string[];
  const [openSection, setOpenSection] = useState<Section>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(referralCode ?? null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const toggle = (s: Section) => setOpenSection(p => p === s ? null : s);

  const totalBalance = (cashbackBalance ?? 0) + (walletBalance ?? 0);
  const activeOrders = orders.filter(
    o => !["yetkazildi", "rad_etildi", "mijoz_qabul_qildi"].includes(o.status)
  ).length;

  async function handleSignOut() {
    await signOut();
    toast.success(l.logout);
    navigate("/");
  }

  async function handleSave() {
    if (!form.full_name || !form.phone || !form.region) {
      toast.error(l.profile_error); return;
    }
    const ok = await save();
    if (ok) { toast.success(l.profile_saved); setEditOpen(false); }
  }

  async function handleGetRefCode() {
    const code = await ensureReferralCode();
    setRefCode(code);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", user.id);
      toast.success("Rasm yangilandi");
    } catch {
      toast.error("Rasmni yuklashda xato");
    } finally {
      setAvatarUploading(false);
    }
  }

  const BOTTOM_NAV = [
    { label: l.home,    icon: Home,         path: "/" },
    { label: l.catalog, icon: ShoppingBag,  path: "/?tab=catalog" },
    { label: l.cart,    icon: ShoppingCart, path: "/cart" },
    { label: l.saved,   icon: Heart,        path: "/wishlist" },
    { label: l.cabinet, icon: UserRound,    path: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-[#f2f3f7] pb-28">
      {/* Inject radio CSS once */}
      <style dangerouslySetInnerHTML={{ __html: radioCSS }} />

      {/* ── Header card ───────────────────────────────── */}
      <div className="bg-white px-4 pt-12 pb-5 shadow-sm">
        {user ? (
          <div className="flex items-center gap-4">
            {/* Avatar with edit */}
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16 border-2 border-[#1d4f8a]/20">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#1d4f8a] text-white text-lg font-bold">
                  {getInitials(profile?.full_name || user.email)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#1d4f8a] flex items-center justify-center border-2 border-white"
              >
                <Camera className="h-2.5 w-2.5 text-white" />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              {/* Online dot */}
              <div className="absolute -top-0.5 -left-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-[17px] text-slate-900 truncate">
                {profile?.full_name || "Foydalanuvchi"}
              </p>
              <p className="text-[12px] text-slate-400 truncate">{user.email}</p>
              {profile?.phone && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3" /> {profile.phone}
                </p>
              )}
              {totalBalance > 0 && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-500 text-[10px] font-bold">
                  💰 {totalBalance.toLocaleString()} so'm
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center justify-center h-9 w-9 rounded-2xl bg-[#1d4f8a]/10 text-[#1d4f8a]"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/orders")}
                className="flex flex-col items-center justify-center h-9 w-9 rounded-2xl bg-slate-100 text-slate-600 relative"
              >
                <Package className="h-4 w-4" />
                {activeOrders > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {activeOrders}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Guest state */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                <UserRound className="h-7 w-7 text-slate-400" />
              </div>
              <div>
                <p className="font-bold text-[16px] text-slate-900">{l.guest_title}</p>
                <p className="text-[12px] text-slate-400">{l.guest_sub}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1.5 bg-[#1d4f8a] text-white text-[13px] font-bold px-4 py-2.5 rounded-2xl active:scale-95 transition"
            >
              {l.login_btn} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Edit profile modal ─────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[16px] font-extrabold text-slate-900">{l.edit_profile}</h2>
              <button onClick={() => setEditOpen(false)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{l.full_name}</label>
              <input
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="Abdullayev Akbar"
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-[14px] text-slate-800 focus:border-[#1d4f8a] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{l.phone}</label>
              <input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+998 90 123 45 67"
                type="tel"
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-[14px] text-slate-800 focus:border-[#1d4f8a] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{l.region}</label>
              <select
                value={form.region}
                onChange={e => setForm({ ...form, region: e.target.value })}
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-[14px] text-slate-700 focus:border-[#1d4f8a] focus:outline-none transition"
              >
                <option value="">{l.choose_region}</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-600 font-semibold text-[14px] active:scale-[0.98] transition"
              >
                {l.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-12 rounded-2xl bg-[#1d4f8a] text-white font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? l.saving : l.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats row ─────────────────────────────────── */}
      {user && (
        <div className="mx-4 mt-3 grid grid-cols-4 gap-2">
          {[
            { label: l.orders,   value: orders.length,   icon: "📦", path: "/orders" },
            { label: l.wishlist, value: wishlist.length,  icon: "❤️", path: "/wishlist" },
            { label: l.cashback, value: cashbackBalance > 0 ? `${Math.floor(cashbackBalance/1000)}K` : "0", icon: "🎁", path: null },
            { label: l.wallet_balance, value: walletBalance > 0 ? `${Math.floor(walletBalance/1000)}K` : "0", icon: "💳", path: null },
          ].map(stat => (
            <button
              key={stat.label}
              onClick={() => stat.path && navigate(stat.path)}
              className="bg-white rounded-2xl p-2.5 text-center shadow-sm active:scale-95 transition cursor-default"
              style={{ cursor: stat.path ? "pointer" : "default" }}
            >
              <div className="text-lg mb-0.5">{stat.icon}</div>
              <div className="font-extrabold text-[14px] text-slate-900">{stat.value}</div>
              <div className="text-[9px] text-slate-400 leading-tight mt-0.5">{stat.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* ── Quick nav ─────────────────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
        <MenuItem icon={<Package className="h-5 w-5 text-[#1d4f8a]" />}   label={l.my_orders}  onClick={() => navigate("/orders")} />
        <MenuItem icon={<Heart className="h-5 w-5 text-rose-500" />}      label={l.my_wishlist} onClick={() => navigate("/wishlist")} />
        <MenuItem icon={<MapPin className="h-5 w-5 text-emerald-500" />}   label={l.pickup}     onClick={() => navigate("/pickup-points")} last />
      </div>

      {/* ── Account & services ────────────────────────── */}
      <p className="mx-4 mt-4 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        {l.account_services}
      </p>
      <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <MenuItem icon={<HelpCircle className="h-5 w-5 text-blue-400" />} label={l.faq}
          onClick={() => window.open("https://t.me/HammaBopSupport", "_blank", "noopener,noreferrer")} />
        <MenuItem icon={<Mail className="h-5 w-5 text-violet-400" />} label={l.contact}
          onClick={() => window.open("tel:+998901234567")} />

        {/* App download */}
        <div className="flex items-center justify-between px-4 py-3.5 border-t border-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-slate-500" />
            </div>
            <span className="text-[14px] font-medium text-slate-800">{l.app}</span>
          </div>
          <button
            onClick={() => toast.info("Ilova tez kunda Play Store va App Store da paydo bo'ladi!")}
            className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-slate-600 bg-slate-50 active:scale-95 transition">
            <Download className="h-3.5 w-3.5" /> {l.download}
          </button>
        </div>

        {/* Language — neumorphic radio */}
        <div className="flex items-center justify-between px-4 py-3.5 border-t border-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg">🌐</div>
            <span className="text-[14px] font-medium text-slate-800">{l.language}</span>
          </div>
          <div className="radio-inputs" style={{ width: 160, padding: "0.35rem", gap: "0.35rem" }}>
            {(["uz", "ru"] as Lang[]).map(code => (
              <label key={code} className="radio">
                <input
                  name="lang-radio"
                  type="radio"
                  checked={lang === code}
                  onChange={() => setLang(code)}
                />
                <span className="name">{code === "uz" ? "O'zbek" : "Русский"}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Wallet card (logged in) ────────────────────── */}
      {user && totalBalance > 0 && (
        <div className="mx-4 mt-3 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1d4f8a] to-[#163e70] shadow-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-4 w-4 text-white/70" />
            <p className="text-[12px] font-semibold text-white/70 uppercase tracking-wide">{l.wallet_balance}</p>
          </div>
          <div className="flex gap-4">
            <div>
              <p className="text-[10px] text-white/50 mb-0.5">{l.cashback}</p>
              <p className="text-[18px] font-extrabold text-white">{cashbackBalance.toLocaleString()} <span className="text-[11px] font-normal">so'm</span></p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-[10px] text-white/50 mb-0.5">{l.wallet_balance}</p>
              <p className="text-[18px] font-extrabold text-white">{walletBalance.toLocaleString()} <span className="text-[11px] font-normal">so'm</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ── Referral ─────────────────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => { toggle("referral"); if (openSection !== "referral") handleGetRefCode(); }}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-yellow-50 flex items-center justify-center">
              <Gift className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-left">
              <p className="text-[14px] font-semibold text-slate-800">{l.referral}</p>
              <p className="text-[10px] text-slate-400">{l.referral_sub}</p>
            </div>
          </div>
          {openSection === "referral" ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {openSection === "referral" && (
          <div className="border-t border-slate-50 px-4 py-4">
            <p className="text-[11px] text-slate-500 mb-2 uppercase tracking-wide font-semibold">{l.referral_code}</p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2.5">
              <code className="flex-1 text-[15px] font-extrabold text-[#1d4f8a] tracking-widest">
                {refCode ?? "------"}
              </code>
              <button
                onClick={() => {
                  if (!refCode) return;
                  navigator.clipboard.writeText(refCode);
                  toast.success(l.copied);
                }}
                className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-[#1d4f8a] transition"
              >
                <Copy className="h-3.5 w-3.5" /> {l.copy}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              {lang === "uz"
                ? "Kodingizni do'stlaringizga yuboring. Ular ro'yxatdan o'tganda ikkalangiz ham bonus olasiz!"
                : "Поделитесь кодом с друзьями. При регистрации оба получите бонус!"}
            </p>
          </div>
        )}
      </div>

      {/* ── Biz haqimizda ─────────────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => toggle("about")}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-[14px] font-semibold text-slate-800">{l.about_us}</span>
          </div>
          {openSection === "about" ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {openSection === "about" && (
          <div className="border-t border-slate-50">
            <SubItem icon={<MapPin className="h-4 w-4 text-emerald-500" />}  label={l.pickup_points} onClick={() => navigate("/pickup-points")} />
            <SubItem icon={<Briefcase className="h-4 w-4 text-blue-400" />}  label={l.vacancies}
              onClick={() => window.open("https://t.me/HammaBopSupport", "_blank", "noopener,noreferrer")} last />
          </div>
        )}
      </div>

      {/* ── Hamkorlar ─────────────────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => toggle("partner")}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <HandshakeIcon className="h-5 w-5 text-orange-500" />
            </div>
            <span className="text-[14px] font-semibold text-slate-800">{l.partners}</span>
          </div>
          {openSection === "partner" ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {openSection === "partner" && (
          <div className="border-t border-slate-50">
            <SubItem icon={<ShoppingBag className="h-4 w-4 text-orange-500" />}    label={l.sell_with_us}
              onClick={() => window.open("https://t.me/HammaBopSupport", "_blank", "noopener,noreferrer")} />
            <SubItem icon={<LayoutDashboard className="h-4 w-4 text-violet-500" />} label={l.seller_cabinet}
              onClick={() => window.open("https://t.me/HammaBopSupport", "_blank", "noopener,noreferrer")} />
            <SubItem icon={<MapPin className="h-4 w-4 text-emerald-500" />}         label={l.open_pickup}
              onClick={() => window.open("https://t.me/HammaBopSupport", "_blank", "noopener,noreferrer")} last />
          </div>
        )}
      </div>

      {/* ── Notifications ─────────────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => toggle("notify")}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <Bell className="h-5 w-5 text-slate-500" />
            </div>
            <span className="text-[14px] font-semibold text-slate-800">{l.notifications}</span>
          </div>
          {openSection === "notify" ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {openSection === "notify" && (
          <div className="border-t border-slate-50 px-4 py-3">
            <p className="text-[13px] text-slate-400">{l.no_notifications}</p>
          </div>
        )}
      </div>

      {/* ── Admin panel — faqat admin roli uchun ──────── */}
      {user && profile?.role === "admin" && (
        <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <MenuItem
            icon={<LayoutDashboard className="h-5 w-5 text-[#EE7526]" />}
            label={l.admin_panel}
            labelClass="text-[#EE7526] font-bold"
            onClick={() => navigate("/admin")}
          />
        </div>
      )}

      {/* ── Stars / rating row ────────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}
        </div>
        <p className="text-[12px] text-slate-500 flex-1">
          {lang === "uz" ? "Ilovani baholang — sizning fikringiz muhim!" : "Оцените приложение — ваше мнение важно!"}
        </p>
        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
      </div>

      {/* ── Sign out ──────────────────────────────────── */}
      {user && (
        <div className="mx-4 mt-3">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 text-red-500 font-semibold text-[14px] active:scale-[0.98] transition"
          >
            <LogOut className="h-4 w-4" /> {l.logout}
          </button>
        </div>
      )}

      <p className="text-center text-[11px] text-slate-300 mt-5 mb-2">{l.version} · 2025</p>

      {/* ── Bottom Nav — Liquid Glass ───────────────── */}
      <nav className="fixed bottom-4 left-0 right-0 z-[200] px-5 pointer-events-none">
        <div className="mx-auto max-w-sm pointer-events-auto">
          <div
            className="flex items-center justify-around rounded-[36px] px-1 py-1.5"
            style={{
              background: "rgba(255,255,255,0.62)",
              backdropFilter: "blur(30px) saturate(180%)",
              WebkitBackdropFilter: "blur(30px) saturate(180%)",
              border: "1.5px solid rgba(255,255,255,0.75)",
              boxShadow: "0 4px 30px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,1) inset, 0 -1px 0 rgba(0,0,0,0.04) inset",
            }}
          >
            <PNavBtn active={false} label={l.home} color="#FF6B35" bubbleBg="rgba(255,107,53,0.14)" onClick={() => navigate("/")}>
              <Home className="h-[21px] w-[21px]" strokeWidth={1.8} />
            </PNavBtn>
            <PNavBtn active={false} label={l.catalog} color="#3B82F6" bubbleBg="rgba(59,130,246,0.14)" onClick={() => navigate("/?tab=catalog")}>
              <svg className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" />
                <rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" />
              </svg>
            </PNavBtn>
            <PNavBtn active={false} label={l.cart} color="#F59E0B" bubbleBg="rgba(245,158,11,0.14)" onClick={() => navigate("/cart")}>
              <ShoppingCart className="h-[21px] w-[21px]" strokeWidth={1.8} />
            </PNavBtn>
            <PNavBtn active={false} label={l.saved} color="#10B981" bubbleBg="rgba(16,185,129,0.14)" onClick={() => navigate("/wishlist")}>
              <Heart className="h-[21px] w-[21px]" strokeWidth={1.8} />
            </PNavBtn>
            <PNavBtn active={true} label={l.cabinet} color="#8B5CF6" bubbleBg="rgba(139,92,246,0.14)" onClick={() => {}}>
              <Avatar className="h-[21px] w-[21px]">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-violet-400 text-[7px] font-bold text-white">
                  {getInitials(profile?.full_name || user?.email || "")}
                </AvatarFallback>
              </Avatar>
            </PNavBtn>
          </div>
        </div>
      </nav>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */
/* ── Liquid nav button (same as Index.tsx LiquidBtn) ── */
function PNavBtn({ active, label, color, bubbleBg, onClick, children }: {
  active: boolean; label: string; color: string; bubbleBg: string;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={() => { try { if ("vibrate" in navigator) navigator.vibrate(active ? 6 : 10); } catch {} onClick(); }}
      className="relative flex flex-col items-center justify-center gap-0.5 w-[56px] py-2 select-none"
      style={{ color: active ? color : "#8e8e93", transition: "color 0.3s ease" }}>
      <span className="absolute inset-0 rounded-[20px]" style={{
        background: bubbleBg,
        transform: active ? "scale(1)" : "scale(0)",
        opacity: active ? 1 : 0,
        transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        transformOrigin: "center bottom",
      }} />
      {active && <span className="absolute left-2 top-1.5 h-[6px] rounded-full pointer-events-none"
        style={{ width:"40%", background:"rgba(255,255,255,0.55)", filter:"blur(1px)" }} />}
      <span className="relative z-10" style={{ transform: active ? "scale(1.12) translateY(-1px)" : "scale(1)", transition:"transform 0.45s cubic-bezier(0.34,1.56,0.64,1)" }}>
        {children}
      </span>
      <span className="relative z-10 text-[9px] font-semibold leading-none" style={{ opacity: active ? 1 : 0.7, transition:"opacity 0.3s ease" }}>
        {label}
      </span>
    </button>
  );
}

function MenuItem({
  icon, label, onClick, last = false, labelClass = "",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  last?: boolean;
  labelClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-slate-50 transition ${
        !last ? "border-b border-slate-50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className={`text-[14px] font-medium text-slate-800 ${labelClass}`}>{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  );
}

function SubItem({
  icon, label, onClick, last = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 active:bg-slate-50 ${
        !last ? "border-b border-slate-50" : ""
      }`}
    >
      <div className="ml-12 flex items-center gap-3">
        {icon}
        <span className="text-[13px] text-slate-700 font-medium">{label}</span>
      </div>
    </button>
  );
}
