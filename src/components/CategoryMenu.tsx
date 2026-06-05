import { useState } from "react";
import {
  Cpu, Monitor, Shirt, Footprints, Home, Car, Baby,
  Gamepad2, Dumbbell, Watch, Briefcase, Wrench, ShoppingBag,
  ChevronRight, ChevronLeft, X, Search,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

type Loc = { uz: string; ru: string };
type Category = { label: Loc; icon: React.ElementType; sub: Loc[] };

const categories: Category[] = [
  {
    label: { uz: "Mobil telefonlar", ru: "Мобильные телефоны" }, icon: Cpu,
    sub: [{ uz: "Smartfonlar", ru: "Смартфоны" }, { uz: "Aksessuarlar", ru: "Аксессуары" },
    { uz: "Qo'ng'iroq qutilar", ru: "Чехлы" }, { uz: "SIM kartalar", ru: "SIM-карты" }],
  },
  {
    label: { uz: "Kompyuter & Noutbuk", ru: "Компьютеры и ноутбуки" }, icon: Monitor,
    sub: [{ uz: "Noutbuklar", ru: "Ноутбуки" }, { uz: "Klaviatura va sichqoncha", ru: "Клавиатуры и мыши" },
    { uz: "Monitorlar", ru: "Мониторы" }, { uz: "USB qurilmalar", ru: "USB-устройства" }],
  },
  {
    label: { uz: "Kiyim-kechak", ru: "Одежда" }, icon: Shirt,
    sub: [{ uz: "Erkaklar uchun", ru: "Для мужчин" }, { uz: "Ayollar uchun", ru: "Для женщин" },
    { uz: "Bolalar uchun", ru: "Для детей" }, { uz: "Sport kiyimlar", ru: "Спортивная одежда" }],
  },
  {
    label: { uz: "Poyabzal", ru: "Обувь" }, icon: Footprints,
    sub: [{ uz: "Krossovkalar", ru: "Кроссовки" }, { uz: "Klassik poyabzal", ru: "Классическая обувь" },
    { uz: "Sandal & Shippak", ru: "Сандалии и тапочки" }, { uz: "Bolalar poyabzali", ru: "Детская обувь" }],
  },
  {
    label: { uz: "Uy va ofis", ru: "Дом и офис" }, icon: Home,
    sub: [{ uz: "Mebel", ru: "Мебель" }, { uz: "Bezak buyumlar", ru: "Декор" },
    { uz: "Yoritish", ru: "Освещение" }, { uz: "Oshxona jihozlari", ru: "Кухонные принадлежности" }],
  },
  {
    label: { uz: "Avtomobil", ru: "Автомобиль" }, icon: Car,
    sub: [{ uz: "Ehtiyot qismlar", ru: "Запчасти" }, { uz: "Shinalar & Disklar", ru: "Шины и диски" },
    { uz: "Avtokimyo", ru: "Автохимия" }, { uz: "Aksessuarlar", ru: "Аксессуары" }],
  },
  {
    label: { uz: "Bolalar tovarlari", ru: "Детские товары" }, icon: Baby,
    sub: [{ uz: "O'yinchoqlar", ru: "Игрушки" }, { uz: "Bolalar kiyimi", ru: "Детская одежда" },
    { uz: "Ko'ngilxushlik", ru: "Развлечения" }, { uz: "Maktab jihozlari", ru: "Школьные товары" }],
  },
  {
    label: { uz: "O'yinlar & Hobby", ru: "Игры и хобби" }, icon: Gamepad2,
    sub: [{ uz: "Konsollar", ru: "Консоли" }, { uz: "O'yinlar", ru: "Игры" },
    { uz: "Modellash", ru: "Моделирование" }, { uz: "Chizma & San'at", ru: "Рисование и искусство" }],
  },
  {
    label: { uz: "Sport & Sog'liq", ru: "Спорт и здоровье" }, icon: Dumbbell,
    sub: [{ uz: "Fitnes jihozlari", ru: "Фитнес-оборудование" }, { uz: "Velosiped", ru: "Велосипеды" },
    { uz: "Yurish uchun", ru: "Для ходьбы" }, { uz: "Vitaminlar", ru: "Витамины" }],
  },
  {
    label: { uz: "Soatlar & Zargarlik", ru: "Часы и украшения" }, icon: Watch,
    sub: [{ uz: "Smart soatlar", ru: "Умные часы" }, { uz: "Qo'l soatlari", ru: "Наручные часы" },
    { uz: "Uzuklar", ru: "Кольца" }, { uz: "Marjonlar", ru: "Ожерелья" }],
  },
  {
    label: { uz: "Sumkalar", ru: "Сумки" }, icon: Briefcase,
    sub: [{ uz: "Yelkasumkalar", ru: "Сумки через плечо" }, { uz: "Ryukzaklar", ru: "Рюкзаки" },
    { uz: "Hamyon", ru: "Кошельки" }, { uz: "Safarlik sumkalar", ru: "Дорожные сумки" }],
  },
  {
    label: { uz: "Asbob-uskuna", ru: "Инструменты" }, icon: Wrench,
    sub: [{ uz: "Elektr asboblar", ru: "Электроинструменты" }, { uz: "Qurilish materiallari", ru: "Стройматериалы" },
    { uz: "Santexnika", ru: "Сантехника" }, { uz: "Bog'dorchilik", ru: "Садоводство" }],
  },
  {
    label: { uz: "Go'zallik & Parfyumeriya", ru: "Красота и парфюмерия" }, icon: ShoppingBag,
    sub: [{ uz: "Makiyaj", ru: "Макияж" }, { uz: "Parvarish", ru: "Уход" },
    { uz: "Atir", ru: "Парфюм" }, { uz: "Soch parvarishi", ru: "Уход за волосами" }],
  },
];

type Props = { open: boolean; onClose: () => void };

export function CategoryMenu({ open, onClose }: Props) {
  const { lang } = useI18n();
  const [hovered, setHovered] = useState(0);
  const [mobileSubOpen, setMobileSubOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState("");

  if (!open) return null;

  const activeCat = selectedCat !== null ? selectedCat : hovered;

  /* ── DESKTOP ── */
  const Desktop = (
    <div
      className="absolute left-0 top-full z-40 mt-0.5 hidden sm:flex rounded-b-2xl border border-blue-100 bg-white shadow-2xl overflow-hidden"
      style={{ width: 700 }}
    >
      {/* Left: category list */}
      <ul className="w-56 shrink-0 border-r border-neutral-100 py-2 overflow-y-auto max-h-[480px]">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          const active = hovered === i;
          return (
            <li key={cat.label.uz}>
              <button
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? "bg-blue-50 text-[#1d4f8a] font-semibold"
                    : "text-neutral-700 hover:bg-blue-50/60"
                }`}
                onMouseEnter={() => setHovered(i)}
                onClick={() => setHovered(i)}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    active ? "bg-[#1d4f8a]" : "bg-blue-50"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${active ? "text-white" : "text-[#1d4f8a]"}`}
                  />
                </span>
                <span className="flex-1 leading-tight">{cat.label[lang]}</span>
                <ChevronRight
                  className={`h-4 w-4 ${active ? "text-[#1d4f8a]" : "text-neutral-300"}`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Right: subcategories */}
      <div className="flex-1 p-6">
        <h3 className="mb-5 text-base font-extrabold text-neutral-900">
          {categories[hovered].label[lang]}
        </h3>
        <ul className="grid grid-cols-2 gap-2">
          {categories[hovered].sub.map((sub) => (
            <li key={sub.uz}>
              <button
                onClick={onClose}
                className="w-full rounded-xl border border-neutral-100 px-3 py-2.5 text-left text-sm font-medium text-neutral-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1d4f8a]"
              >
                {sub[lang]}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  /* ── MOBILE ── */
  const Mobile = (
    <div className="fixed inset-0 z-40 flex flex-col bg-white sm:hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100">
        {mobileSubOpen ? (
          <button
            onClick={() => setMobileSubOpen(false)}
            className="flex items-center gap-1.5 text-sm font-semibold text-neutral-600"
          >
            <ChevronLeft className="h-5 w-5" />
            Orqaga
          </button>
        ) : (
          <span className="text-[17px] font-extrabold text-neutral-900">Katalog</span>
        )}
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100"
        >
          <X className="h-4.5 w-4.5 text-neutral-600" />
        </button>
      </div>

      {/* Active filter chip + search — only on main list */}
      {!mobileSubOpen && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-100">
          {selectedCat !== null && (
            <button
              onClick={() => setSelectedCat(null)}
              className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600"
            >
              <X className="h-3 w-3" />
              {categories[selectedCat].label[lang]}
            </button>
          )}
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-neutral-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Kategoriyani qidiring..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
        </div>
      )}

      {/* Subcategory view */}
      {mobileSubOpen ? (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <h3 className="mb-4 text-lg font-extrabold text-[#1d4f8a]">
            {categories[activeCat].label[lang]}
          </h3>
          <ul className="space-y-1.5">
            {categories[activeCat].sub.map((sub) => (
              <li key={sub.uz}>
                <button
                  onClick={onClose}
                  className="flex w-full items-center justify-between rounded-2xl border border-neutral-100 px-4 py-3.5 text-left text-[14px] font-medium text-neutral-800 transition hover:bg-blue-50 hover:text-[#1d4f8a]"
                >
                  {sub[lang]}
                  <ChevronRight className="h-4 w-4 text-neutral-300" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        /* Main category list */
        <ul className="flex-1 overflow-y-auto divide-y divide-neutral-50">
          {categories
            .filter((cat) =>
              searchQ
                ? cat.label[lang].toLowerCase().includes(searchQ.toLowerCase())
                : true
            )
            .map((cat, i) => {
              const Icon = cat.icon;
              const realIdx = categories.indexOf(cat);
              const active = selectedCat === realIdx;
              return (
                <li key={cat.label.uz}>
                  <button
                    className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition ${
                      active ? "bg-blue-50" : "bg-white"
                    }`}
                    onClick={() => {
                      setSelectedCat(realIdx);
                      setMobileSubOpen(true);
                    }}
                  >
                    {/* Icon circle */}
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                      <Icon className="h-5 w-5 text-[#1d4f8a]" />
                    </span>

                    <span
                      className={`flex-1 text-[14.5px] font-medium leading-tight ${
                        active ? "text-[#1d4f8a] font-semibold" : "text-neutral-800"
                      }`}
                    >
                      {cat.label[lang]}
                    </span>

                    <ChevronRight
                      className={`h-5 w-5 ${
                        active ? "text-[#1d4f8a]" : "text-neutral-300"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-30 sm:hidden" />
      <div className="fixed inset-0 z-30 hidden sm:block" onClick={onClose} />
      {Desktop}
      {Mobile}
    </>
  );
}
