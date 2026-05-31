import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { encodeOrderRef, formatPrice } from "./telegram.ts";

// ─── Config ──────────────────────────────────────────────────────────────────

export const ADMIN_TELEGRAM_IDS = new Set(
  (Deno.env.get("ADMIN_TELEGRAM_IDS") ?? "5064451675")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => !Number.isNaN(id)),
);

export const PAYMENT_CARD_NUMBER = Deno.env.get("PAYMENT_CARD_NUMBER") ?? "";
export const PAYMENT_CARD_HOLDER = Deno.env.get("PAYMENT_CARD_HOLDER") ?? "";

export const ORDER_SELECT =
  "id,total_amount,status,payment_status,customer_name,customer_phone,customer_region,created_at,items,user_id,receipt_file_id";

const ORDERS_PAGE_SIZE = 5;

// ─── Constants ───────────────────────────────────────────────────────────────

export const statusMap: Record<string, string> = {
  yangi: "🆕 Yangi",
  qabul_qilindi: "✅ Qabul qilindi",
  tolov_jarayonida: "💳 To'lov jarayonida",
  qadoqlanmoqda: "📦 Qadoqlanmoqda",
  yetkazilmoqda: "🚚 Yetkazilmoqda",
  mijoz_qabul_qildi: "🎉 Qabul qildi",
  rad_etildi: "❌ Rad etildi",
};

export const paymentStatusMap: Record<string, string> = {
  unpaid: "💰 To'lanmagan",
  pending: "⏳ Tekshirilmoqda",
  paid: "✅ To'langan",
  rejected: "❌ Rad etilgan",
};

export const ORDER_STATUSES = [
  "yangi",
  "qabul_qilindi",
  "tolov_jarayonida",
  "qadoqlanmoqda",
  "yetkazilmoqda",
  "mijoz_qabul_qildi",
  "rad_etildi",
] as const;

export const STATUS_FLOW = [
  "yangi",
  "qabul_qilindi",
  "tolov_jarayonida",
  "qadoqlanmoqda",
  "yetkazilmoqda",
  "mijoz_qabul_qildi",
] as const;

const LINE = "─────────────────────";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BotOrderRow = {
  id: string;
  user_id?: string | null;
  total_amount: number;
  status: string;
  payment_status?: string | null;
  customer_name: string | null;
  customer_phone?: string | null;
  customer_region: string | null;
  created_at: string;
  receipt_file_id?: string | null;
  items:
    | Array<{
        product_name?: string;
        quantity?: number;
        price?: number;
      }>
    | null;
};

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export function isAdminTelegram(telegramId: number) {
  return ADMIN_TELEGRAM_IDS.has(telegramId);
}

export async function resolveAdminMode(
  adminClient: ReturnType<typeof createClient>,
  telegramId: number,
): Promise<boolean> {
  if (isAdminTelegram(telegramId)) return true;

  const { data } = await adminClient
    .from("users")
    .select("role")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  return data?.role === "admin";
}

// ─── Order helpers ────────────────────────────────────────────────────────────

export function isValidOrderStatus(status: string) {
  return ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number]);
}

export function isOrderPaid(order: Pick<BotOrderRow, "payment_status">) {
  return order.payment_status === "paid";
}

export function needsPayment(order: Pick<BotOrderRow, "payment_status" | "status">) {
  if (order.payment_status === "paid") return false;
  return order.status !== "rad_etildi" && order.status !== "mijoz_qabul_qildi";
}

// ─── Keyboards ────────────────────────────────────────────────────────────────

export function buildStatusKeyboard(orderId: string, currentStatus?: string) {
  const token = encodeOrderRef(orderId);

  const statusButtons = [
    ["🆕 Yangi", "yangi"],
    ["✅ Qabul", "qabul_qilindi"],
    ["💳 To'lov", "tolov_jarayonida"],
    ["📦 Qadoqlash", "qadoqlanmoqda"],
    ["🚚 Yetkazish", "yetkazilmoqda"],
    ["🎉 Topshirildi", "mijoz_qabul_qildi"],
  ] as [string, string][];

  const rows: Array<Array<{ text: string; callback_data: string }>> = [
    statusButtons.slice(0, 3).map(([label, status]) => ({
      text: currentStatus === status ? `◉ ${label}` : label,
      callback_data: `set:${token}:${status}`,
    })),
    statusButtons.slice(3).map(([label, status]) => ({
      text: currentStatus === status ? `◉ ${label}` : label,
      callback_data: `set:${token}:${status}`,
    })),
    [
      { text: "❌ Rad etish", callback_data: `set:${token}:rad_etildi` },
      { text: "📞 Telefon", callback_data: `tel:${token}` },
      { text: "🔄 Yangilash", callback_data: `refresh:${token}` },
    ],
  ];

  return { inline_keyboard: rows };
}

export function buildUserOrderKeyboard(order: BotOrderRow) {
  const token = encodeOrderRef(order.id);
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  const row1: Array<{ text: string; callback_data: string }> = [
    { text: "🔄 Yangilash", callback_data: `refresh:${token}` },
  ];
  if (needsPayment(order)) {
    row1.push({ text: "💳 To'lov qilish", callback_data: `pay:${token}` });
  }
  rows.push(row1);
  rows.push([{ text: "📋 Barcha buyurtmalar", callback_data: "orders:1" }]);

  return { inline_keyboard: rows };
}

export function buildOrdersListKeyboard(
  orders: BotOrderRow[],
  page: number,
  hasMore: boolean,
) {
  const orderRows = orders.map((order) => {
    const token = encodeOrderRef(order.id);
    const shortId = order.id.slice(0, 8).toUpperCase();
    const emoji = statusMap[order.status]?.split(" ")[0] ?? "📦";
    const payBadge = needsPayment(order) ? " 💳" : "";

    return [
      {
        text: `${emoji} #${shortId}${payBadge}`,
        callback_data: `view:${token}`,
      },
    ];
  });

  const navRow: Array<{ text: string; callback_data: string }> = [];
  if (page > 1) navRow.push({ text: "⬅️ Oldingi", callback_data: `orders:${page - 1}` });
  if (hasMore) navRow.push({ text: "Keyingi ➡️", callback_data: `orders:${page + 1}` });

  return {
    inline_keyboard: navRow.length ? [...orderRows, navRow] : orderRows,
  };
}

export function buildReceiptReviewKeyboard(orderId: string) {
  const token = encodeOrderRef(orderId);
  return {
    inline_keyboard: [
      [
        { text: "✅ Tasdiqlash", callback_data: `rcpt_ok:${token}` },
        { text: "❌ Rad etish", callback_data: `rcpt_no:${token}` },
      ],
      [
        { text: "📞 Telefon", callback_data: `tel:${token}` },
        { text: "🔄 Yangilash", callback_data: `refresh:${token}` },
      ],
    ],
  };
}

export function buildPaymentPromptKeyboard(orderId: string) {
  const token = encodeOrderRef(orderId);
  return {
    inline_keyboard: [
      [{ text: "📸 Chek yuborish", callback_data: `receipt:${token}` }],
      [{ text: "🚫 Bekor qilish", callback_data: `cancel_receipt:${token}` }],
    ],
  };
}

export function buildBackToOrdersKeyboard() {
  return {
    inline_keyboard: [[{ text: "📋 Barcha buyurtmalar", callback_data: "orders:1" }]],
  };
}

// ─── Renders ─────────────────────────────────────────────────────────────────

export function renderStatusTransition(previousStatus: string, currentStatus: string) {
  if (previousStatus === currentStatus) return null;
  return `🔄 ${statusMap[previousStatus] ?? previousStatus} → ${statusMap[currentStatus] ?? currentStatus}`;
}

export function renderStatusProgress(currentStatus: string) {
  if (currentStatus === "rad_etildi") {
    return `📊 Holat:\n❌ Rad etildi`;
  }

  const idx = STATUS_FLOW.indexOf(currentStatus as (typeof STATUS_FLOW)[number]);
  const safeIdx = idx === -1 ? 0 : idx;

  const steps = STATUS_FLOW.map((step, i) => {
    const label = statusMap[step] ?? step;
    return i < safeIdx ? `✅ ${label}` : i === safeIdx ? `▶️ ${label}` : `⏳ ${label}`;
  });

  return `📊 Holat:\n${steps.join("\n")}`;
}

export function renderOrder(
  order: BotOrderRow,
  options?: { admin?: boolean; previousStatus?: string | null; compact?: boolean },
) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText = items.length
    ? items
        .map(
          (item) =>
            `  • ${item.product_name ?? "Mahsulot"} × ${item.quantity ?? 0} = ${formatPrice(
              Number(item.price ?? 0) * Number(item.quantity ?? 0),
            )}`,
        )
        .join("\n")
    : "  • (mahsulotlar topilmadi)";

  const shortId = `#${order.id.slice(0, 8).toUpperCase()}`;
  const paymentLine =
    order.payment_status
      ? `💰 To'lov: ${paymentStatusMap[order.payment_status] ?? order.payment_status}`
      : null;

  const transition =
    options?.previousStatus && options.previousStatus !== order.status
      ? renderStatusTransition(options.previousStatus, order.status)
      : null;

  if (options?.compact) {
    return [
      `📦 Buyurtma ${shortId}`,
      transition,
      `${statusMap[order.status] ?? order.status}`,
      paymentLine,
      `👤 ${order.customer_name ?? "—"}`,
      `💵 ${formatPrice(Number(order.total_amount ?? 0))}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const lines: (string | null)[] = [
    `📦 Buyurtma ${shortId}`,
    LINE,
    transition,
    renderStatusProgress(order.status),
    paymentLine,
    LINE,
    `📅 ${new Date(order.created_at).toLocaleString("uz-UZ")}`,
    `👤 ${order.customer_name ?? "—"}`,
  ];

  if (options?.admin) {
    lines.push(`📞 ${order.customer_phone ?? "—"}`);
    lines.push(`📍 ${order.customer_region ?? "—"}`);
  } else {
    lines.push(`📍 ${order.customer_region ?? "—"}`);
  }

  lines.push(LINE);
  lines.push("🛒 Mahsulotlar:");
  lines.push(itemsText);
  lines.push(LINE);
  lines.push(`💵 Jami: ${formatPrice(Number(order.total_amount ?? 0))}`);

  if (options?.admin) {
    lines.push("\n📌 Pastdagi tugmalar orqali holat o'zgartiring.");
  }

  return lines.filter((l) => l !== null).join("\n");
}

export function renderOrderListSummary(orders: BotOrderRow[], page: number, hasMore: boolean) {
  const pageInfo = hasMore || page > 1 ? ` (${page}-sahifa)` : "";
  const lines = orders.map((order) => {
    const shortId = `#${order.id.slice(0, 8).toUpperCase()}`;
    const emoji = statusMap[order.status]?.split(" ")[0] ?? "📦";
    const payBadge = needsPayment(order) ? " 💳" : "";
    return `${emoji}${payBadge} ${shortId} — ${formatPrice(Number(order.total_amount ?? 0))}`;
  });

  return [
    `📋 Buyurtmalaringiz${pageInfo}`,
    LINE,
    ...lines,
    LINE,
    "👇 Ko'rish uchun tugmani bosing.",
  ].join("\n");
}

export function renderAdminOrderListSummary(orders: BotOrderRow[], page: number) {
  const lines = orders.map((order) => {
    const shortId = `#${order.id.slice(0, 8).toUpperCase()}`;
    const emoji = statusMap[order.status]?.split(" ")[0] ?? "📦";
    const payBadge = needsPayment(order) ? " 💳" : "";
    return `${emoji}${payBadge} ${shortId} — ${order.customer_name ?? "?"} — ${formatPrice(Number(order.total_amount ?? 0))}`;
  });

  return [`🗂 Buyurtmalar (${page}-sahifa)`, LINE, ...lines].join("\n");
}

export function renderPaymentInstructions(order: BotOrderRow) {
  const shortId = `#${order.id.slice(0, 8).toUpperCase()}`;
  return [
    `💳 To'lov — buyurtma ${shortId}`,
    LINE,
    renderOrder(order),
    LINE,
    "📌 To'lov rekvizitlari:",
    `  Karta: ${PAYMENT_CARD_NUMBER}`,
    `  Egasi: ${PAYMENT_CARD_HOLDER}`,
    `  Summa: ${formatPrice(Number(order.total_amount ?? 0))}`,
    LINE,
    "📸 O'tkazma chekini shu chatga rasm sifatida yuboring.",
    "Yoki pastdagi «Chek yuborish» tugmasini bosing.",
  ].join("\n");
}

export function renderReceiptUploadPrompt(order: BotOrderRow) {
  return [
    `📸 Chek yuborish — #${order.id.slice(0, 8).toUpperCase()}`,
    LINE,
    "To'lov chekining rasmini shu chatga yuboring.",
    "Skrinshot yoki bank ilovasidagi chek ham qabul qilinadi.",
    LINE,
    "⚠️ Bekor qilish uchun /cancel yozing.",
  ].join("\n");
}

export function renderReceiptAdminCaption(order: BotOrderRow) {
  return [
    "💳 Yangi to'lov cheki!",
    LINE,
    `📦 ${`#${order.id.slice(0, 8).toUpperCase()}`}`,
    `👤 ${order.customer_name ?? "—"}`,
    `📞 ${order.customer_phone ?? "—"}`,
    `📍 ${order.customer_region ?? "—"}`,
    `💵 ${formatPrice(Number(order.total_amount ?? 0))}`,
    LINE,
    "✅ Tasdiqlash yoki ❌ Rad etish?",
  ].join("\n");
}

export function renderReceiptApprovedCaption(order: BotOrderRow, previousStatus?: string | null) {
  return [
    "✅ To'lov tasdiqlandi!",
    LINE,
    renderOrder(order, { admin: true, previousStatus, compact: true }),
  ].join("\n");
}

export function renderReceiptRejectedCaption(order: BotOrderRow) {
  return [
    "❌ To'lov rad etildi.",
    LINE,
    renderOrder(order, { admin: true, compact: true }),
  ].join("\n");
}

export function renderStatusChangedMessage(order: BotOrderRow, previousStatus?: string | null) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText = items.length
    ? items
        .map(
          (item) =>
            `  • ${item.product_name ?? "Mahsulot"} × ${item.quantity ?? 0}`,
        )
        .join("\n")
    : "  • (mahsulotlar topilmadi)";

  return [
    `📢 Buyurtma #${order.id.slice(0, 8).toUpperCase()} yangilandi`,
    LINE,
    previousStatus ? renderStatusTransition(previousStatus, order.status) : null,
    renderStatusProgress(order.status),
    LINE,
    `📅 ${new Date(order.created_at).toLocaleString("uz-UZ")}`,
    `🛒 Mahsulotlar:\n${itemsText}`,
    `💵 Jami: ${formatPrice(Number(order.total_amount ?? 0))}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderUnpaidOrdersNotice(orders: BotOrderRow[]) {
  if (!orders.length) return null;
  const header =
    orders.length === 1
      ? "⚠️ Sizda to'lanmagan 1 ta buyurtma bor!"
      : `⚠️ Sizda ${orders.length} ta to'lanmagan buyurtma bor!`;
  return [header, "Ko'rib chiqing va to'lovni amalga oshiring."].join("\n");
}

export function renderUserPanel(firstName?: string) {
  return [
    `Salom${firstName ? `, ${firstName}` : ""}! 👋`,
    LINE,
    "SmartCam botiga xush kelibsiz!",
    "",
    "📋 Buyruqlar:",
    "  /orders — buyurtmalaringiz",
    "  /help — yordam",
    "  /cancel — jarayonni bekor qilish",
    LINE,
    "Telegram hisobingiz saytga ulangan.",
    "Buyurtma holati o'zgarganda xabar olasiz.",
  ].join("\n");
}

export function renderAdminPanel(firstName?: string) {
  return [
    `Salom${firstName ? `, ${firstName}` : ""}! 👋 Admin`,
    LINE,
    "🔧 Admin buyruqlar:",
    "  /orders — oxirgi buyurtmalar",
    "  /admin_stats — statistika",
    "  /admin_pending — to'lovni kutayotgan",
    "  /admin_orders — barcha so'nggi",
    "  /help — yordam",
  ].join("\n");
}

export function renderHelp(isAdmin: boolean) {
  if (isAdmin) {
    return [
      "ℹ️ Admin yordam",
      LINE,
      "/orders — oxirgi 5 buyurtma",
      "/admin_orders — oxirgi buyurtmalar (batafsil)",
      "/admin_stats — umumiy statistika",
      "/admin_pending — to'lovni kutayotgan buyurtmalar",
      "/cancel — joriy jarayonni bekor qilish",
      "",
      "Inline tugmalar:",
      "  ◉ belgi — joriy holat",
      "  📞 Telefon — mijoz raqamini ko'rish",
      "  🔄 Yangilash — buyurtmani qayta yuklash",
    ].join("\n");
  }

  return [
    "ℹ️ Yordam",
    LINE,
    "/orders — buyurtmalaringizni ko'rish",
    "/cancel — chek yuborish jarayonini bekor qilish",
    "",
    "Buyurtma holati o'zgarganda avtomatik xabar olasiz.",
    "To'lov uchun chek rasmini to'g'ridan-to'g'ri shu chatga yuboring.",
  ].join("\n");
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

export async function resolveAdminChatIds(adminClient: ReturnType<typeof createClient>) {
  const { data: admins } = await adminClient
    .from("users")
    .select("telegram_id")
    .eq("role", "admin")
    .not("telegram_id", "is", null);

  const chatIds = new Set<number>([...ADMIN_TELEGRAM_IDS]);
  for (const admin of admins ?? []) {
    if (typeof admin.telegram_id === "number") chatIds.add(admin.telegram_id);
  }
  return chatIds;
}

export async function prepareReceiptSession(
  adminClient: ReturnType<typeof createClient>,
  telegramId: number,
  userId: string,
  orderId: string,
) {
  const { error } = await adminClient.from("telegram_sessions").upsert(
    {
      telegram_id: telegramId,
      user_id: userId,
      state: "awaiting_receipt",
      temp_data: { order_id: orderId },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  );
  if (error) throw new Error(error.message);
}

export async function clearSession(
  adminClient: ReturnType<typeof createClient>,
  telegramId: number,
  userId: string | null,
  newState = "idle",
) {
  await adminClient.from("telegram_sessions").upsert(
    {
      telegram_id: telegramId,
      user_id: userId,
      state: newState,
      temp_data: {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  );
}

export async function fetchOrdersPage(
  adminClient: ReturnType<typeof createClient>,
  page: number,
  options?: { userId?: string; unpaidOnly?: boolean },
) {
  const offset = (page - 1) * ORDERS_PAGE_SIZE;

  let query = adminClient
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .range(offset, offset + ORDERS_PAGE_SIZE); // fetch one extra to detect hasMore

  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  if (options?.unpaidOnly) {
    query = query
      .neq("payment_status", "paid")
      .filter("status", "not.in", "(rad_etildi,mijoz_qabul_qildi)");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as BotOrderRow[];
  const hasMore = rows.length > ORDERS_PAGE_SIZE;
  return { orders: rows.slice(0, ORDERS_PAGE_SIZE), hasMore };
}
