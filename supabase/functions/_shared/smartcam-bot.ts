import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { encodeOrderRef, encodeOrderToken, formatPrice } from "./telegram.ts";

export const ADMIN_TELEGRAM_IDS = new Set([5064451675]);

export const PAYMENT_CARD_NUMBER = "9860350146115257";
export const PAYMENT_CARD_HOLDER = "Abdulmalik Eraliyev";

export const statusMap: Record<string, string> = {
  yangi: "🆕 Yangi",
  qabul_qilindi: "✅ Qabul qilindi",
  tolov_jarayonida: "💳 To'lov jarayonida",
  qadoqlanmoqda: "📦 Qadoqlanmoqda",
  yetkazilmoqda: "🚚 Yetkazilmoqda",
  mijoz_qabul_qildi: "🎉 Mijoz qabul qildi",
  rad_etildi: "❌ Rad etildi",
};

export const paymentStatusMap: Record<string, string> = {
  unpaid: "To'lanmagan",
  pending: "Tekshirilmoqda",
  paid: "To'langan",
  rejected: "Rad etilgan",
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
  items:
    | Array<{
        product_name?: string;
        quantity?: number;
        price?: number;
      }>
    | null;
};

export function isAdminTelegram(telegramId: number) {
  return ADMIN_TELEGRAM_IDS.has(telegramId);
}

export async function resolveAdminMode(
  adminClient: ReturnType<typeof createClient>,
  telegramId: number,
) {
  if (isAdminTelegram(telegramId)) {
    return true;
  }

  const { data } = await adminClient
    .from("users")
    .select("role")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  return data?.role === "admin";
}

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

export function buildStatusKeyboard(orderId: string) {
  const token = encodeOrderRef(orderId);

  return {
    inline_keyboard: [
      [
        { text: "🆕 Yangi", callback_data: `set:${token}:yangi` },
        { text: "✅ Qabul", callback_data: `set:${token}:qabul_qilindi` },
        { text: "💳 To'lov", callback_data: `set:${token}:tolov_jarayonida` },
      ],
      [
        { text: "📦 Qadoqlash", callback_data: `set:${token}:qadoqlanmoqda` },
        { text: "🚚 Yetkazish", callback_data: `set:${token}:yetkazilmoqda` },
        { text: "🎉 Qabul", callback_data: `set:${token}:mijoz_qabul_qildi` },
      ],
      [{ text: "❌ Rad etish", callback_data: `set:${token}:rad_etildi` }],
    ],
  };
}

export function buildUserOrderKeyboard(order: BotOrderRow) {
  const token = encodeOrderRef(order.id);
  const buttons: Array<{ text: string; callback_data: string }> = [
    { text: `👁 #${order.id.slice(0, 8).toUpperCase()}`, callback_data: `view:${token}` },
  ];

  if (needsPayment(order)) {
    buttons.push({ text: "💳 To'lov", callback_data: `pay:${token}` });
  }

  return { inline_keyboard: [buttons] };
}

export function buildOrdersListKeyboard(orders: BotOrderRow[]) {
  return {
    inline_keyboard: orders.map((order) => {
      const token = encodeOrderRef(order.id);
      const shortId = order.id.slice(0, 8).toUpperCase();
      const row: Array<{ text: string; callback_data: string }> = [
        {
          text: `${statusMap[order.status]?.split(" ")[0] ?? "📦"} #${shortId}`,
          callback_data: `view:${token}`,
        },
      ];

      if (needsPayment(order)) {
        row.push({ text: "💳 To'lov", callback_data: `pay:${token}` });
      }

      return row;
    }),
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
    ],
  };
}

export function renderStatusTransition(previousStatus: string, currentStatus: string) {
  if (previousStatus === currentStatus) return null;
  return `🔄 ${statusMap[previousStatus] ?? previousStatus} → ${statusMap[currentStatus] ?? currentStatus}`;
}

export function renderStatusProgress(currentStatus: string) {
  if (currentStatus === "rad_etildi") {
    return ["📊 Buyurtma holati:", "❌ Rad etildi"].join("\n");
  }

  const currentIndex = STATUS_FLOW.indexOf(currentStatus as (typeof STATUS_FLOW)[number]);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  const lines = STATUS_FLOW.map((step, index) => {
    const label = statusMap[step] ?? step;
    const icon = index <= safeIndex ? "✅" : "⏳";
    return `${icon} ${label}`;
  });

  return ["📊 Buyurtma holati:", ...lines].join("\n");
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
            `• ${item.product_name ?? "Mahsulot"} × ${item.quantity ?? 0} — ${formatPrice(
              Number(item.price ?? 0) * Number(item.quantity ?? 0),
            )}`,
        )
        .join("\n")
    : "• Mahsulotlar topilmadi";

  const paymentLine = order.payment_status
    ? `To'lov: ${paymentStatusMap[order.payment_status] ?? order.payment_status}`
    : null;

  const transition =
    options?.previousStatus && options.previousStatus !== order.status
      ? renderStatusTransition(options.previousStatus, order.status)
      : null;

  const progress = options?.admin ? renderStatusProgress(order.status) : null;

  if (options?.compact) {
    return [
      `Buyurtma #${order.id.slice(0, 8).toUpperCase()}`,
      transition,
      progress,
      paymentLine,
      `Mijoz: ${order.customer_name ?? "—"}`,
      `Summa: ${formatPrice(Number(order.total_amount ?? 0))}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Buyurtma #${order.id.slice(0, 8).toUpperCase()}`,
    transition,
    progress,
    `Holat: ${statusMap[order.status] ?? order.status}`,
    paymentLine,
    `Sana: ${new Date(order.created_at).toLocaleString("uz-UZ")}`,
    `Mijoz: ${order.customer_name ?? "—"}`,
    `Telefon: ${order.customer_phone ?? "—"}`,
    `Hudud: ${order.customer_region ?? "—"}`,
    "",
    "Mahsulotlar:",
    itemsText,
    "",
    `Jami: ${formatPrice(Number(order.total_amount ?? 0))}`,
    ...(options?.admin ? ["", "Inline tugmalar orqali statusni almashtiring."] : []),
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderReceiptApprovedCaption(order: BotOrderRow, previousStatus?: string | null) {
  return [
    "✅ To'lov tasdiqlandi!",
    "",
    renderOrder(order, { admin: true, previousStatus, compact: true }),
  ].join("\n");
}

export function renderReceiptRejectedCaption(order: BotOrderRow) {
  return [
    "❌ To'lov rad etildi.",
    "",
    renderOrder(order, { admin: true, compact: true }),
  ].join("\n");
}

export function renderOrderListSummary(orders: BotOrderRow[]) {
  const lines = orders.map((order) => {
    const shortId = order.id.slice(0, 8).toUpperCase();
    const payMark = needsPayment(order) ? " 💳" : "";
    return `${statusMap[order.status]?.split(" ")[0] ?? "📦"} #${shortId} — ${formatPrice(Number(order.total_amount ?? 0))} — ${order.customer_name ?? "—"} (${order.customer_region ?? "—"})${payMark}`;
  });

  return ["So'nggi buyurtmalaringiz:", "", ...lines, "", "Batafsil ko'rish yoki to'lov uchun tugmalardan foydalaning."].join(
    "\n",
  );
}

export function renderAdminOrderListSummary(orders: BotOrderRow[]) {
  const lines = orders.map((order) => {
    const shortId = order.id.slice(0, 8).toUpperCase();
    return `${statusMap[order.status]?.split(" ")[0] ?? "📦"} #${shortId} — ${formatPrice(Number(order.total_amount ?? 0))} — ${order.customer_name ?? "—"} (${order.customer_region ?? "—"})`;
  });

  return ["Oxirgi buyurtmalar:", "", ...lines].join("\n");
}

export function renderPaymentInstructions(order: BotOrderRow) {
  return [
    `💳 To'lanmagan buyurtma #${order.id.slice(0, 8).toUpperCase()}`,
    "",
    renderOrder(order),
    "",
    "To'lov uchun quyidagi kartaga tizimda belgilangan summani o'tkazing:",
    `Karta: ${PAYMENT_CARD_NUMBER}`,
    `Egasi: ${PAYMENT_CARD_HOLDER}`,
    `Summa: ${formatPrice(Number(order.total_amount ?? 0))}`,
    "",
    "O'tkazmadan keyin chek rasmini shu yerga to'g'ridan-to'g'ri yuboring.",
    "Agar xohlasangiz, pastdagi «Chek yuborish» tugmasini ham bosishingiz mumkin.",
  ].join("\n");
}

export function buildPaymentPromptKeyboard(orderId: string) {
  const token = encodeOrderRef(orderId);
  return {
    inline_keyboard: [[{ text: "📸 Chek yuborish", callback_data: `receipt:${token}` }]],
  };
}

export function renderReceiptUploadPrompt(order: BotOrderRow) {
  return [
    `📸 Chek yuborish — buyurtma #${order.id.slice(0, 8).toUpperCase()}`,
    "",
    "Endi to'lov chekining rasmini shu chatga yuboring (foto sifatida).",
    "Skrinshot yoki bank ilovasidagi chek ham bo'ladi.",
  ].join("\n");
}

export function renderReceiptAdminCaption(order: BotOrderRow) {
  return [
    "💳 To'lov cheki keldi!",
    "",
    `Buyurtma #${order.id.slice(0, 8).toUpperCase()}`,
    `Mijoz: ${order.customer_name ?? "—"}`,
    `Telefon: ${order.customer_phone ?? "—"}`,
    `Summa: ${formatPrice(Number(order.total_amount ?? 0))}`,
    "",
    "Tasdiqlaysizmi yoki rad etasizmi?",
  ].join("\n");
}

export async function resolveAdminChatIds(adminClient: ReturnType<typeof createClient>) {
  const { data: admins } = await adminClient
    .from("users")
    .select("telegram_id")
    .eq("role", "admin")
    .not("telegram_id", "is", null);

  const chatIds = new Set<number>([...ADMIN_TELEGRAM_IDS]);
  for (const admin of admins ?? []) {
    if (typeof admin.telegram_id === "number") {
      chatIds.add(admin.telegram_id);
    }
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

  if (error) {
    throw new Error(error.message);
  }
}

export function renderStatusChangedMessage(order: BotOrderRow, previousStatus?: string | null) {
  return [
    `📢 Buyurtma #${order.id.slice(0, 8).toUpperCase()} holati yangilandi.`,
    previousStatus ? renderStatusTransition(previousStatus, order.status) : null,
    renderStatusProgress(order.status),
    `Jami: ${formatPrice(Number(order.total_amount ?? 0))}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderUnpaidOrdersNotice(orders: BotOrderRow[]) {
  if (!orders.length) return null;

  const header =
    orders.length === 1
      ? "⚠️ Sizda to'lanmagan buyurtma bor!"
      : `⚠️ Sizda ${orders.length} ta to'lanmagan buyurtma bor!`;

  return [header, "", "Quyidagi buyurtmalarni ko'rib chiqing va to'lovni amalga oshiring."].join("\n");
}
