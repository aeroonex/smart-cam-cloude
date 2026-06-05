import { BadgeCheck, ShieldCheck, Truck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export const BRAND_COLOR = "#1d4f8a";
export const BRAND_COLOR_DARK = "#164078";

export const regions = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Samarqand viloyati",
  "Buxoro viloyati",
  "Farg'ona viloyati",
  "Andijon viloyati",
  "Namangan viloyati",
  "Qashqadaryo viloyati",
  "Surxondaryo viloyati",
  "Navoiy viloyati",
  "Xorazm viloyati",
  "Jizzax viloyati",
  "Sirdaryo viloyati",
  "Qoraqalpog'iston R.",
];

export const featureCards = [
  { title: "Tez yetkazib berish", icon: Truck },
  { title: "Xavfsiz to'lov", icon: ShieldCheck },
  { title: "Kafolat", icon: BadgeCheck },
];

export const statusMeta: Record<Order["status"], { label: string; className: string }> = {
  yangi: { label: "Yangi", className: "bg-[#fff4ec] text-[#b4571c]" },
  qabul_qilindi: { label: "Qabul qilindi", className: "bg-emerald-50 text-emerald-700" },
  tolov_jarayonida: { label: "To'lov jarayonida", className: "bg-blue-50 text-blue-700" },
  qadoqlanmoqda: { label: "Qadoqlanmoqda", className: "bg-purple-50 text-purple-700" },
  yetkazilmoqda: { label: "Yetkazilmoqda", className: "bg-blue-50 text-[#b4571c]" },
  mijoz_qabul_qildi: { label: "Mijoz qabul qildi", className: "bg-blue-100 text-[#9a4a18]" },
  rad_etildi: { label: "Rad etildi", className: "bg-[#fff1f1] text-[#b53b3b]" },
};

export const defaultCheckoutForm = {
  full_name: "",
  phone: "",
  region: "",
  notes: "",
};
