import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import { dispatchOrderEvent } from "../_shared/order-events.ts";
import {
  buildBackToOrdersKeyboard,
  buildOrdersListKeyboard,
  buildPaymentPromptKeyboard,
  buildReceiptReviewKeyboard,
  buildStatusKeyboard,
  buildUserOrderKeyboard,
  clearSession,
  fetchOrdersPage,
  isValidOrderStatus,
  needsPayment,
  ORDER_SELECT,
  prepareReceiptSession,
  renderAdminOrderListSummary,
  renderAdminPanel,
  renderHelp,
  renderOrder,
  renderOrderListSummary,
  renderPaymentInstructions,
  renderReceiptAdminCaption,
  renderReceiptApprovedCaption,
  renderReceiptRejectedCaption,
  renderReceiptUploadPrompt,
  renderUnpaidOrdersNotice,
  renderUserPanel,
  resolveAdminChatIds,
  resolveAdminMode,
  statusMap,
  type BotOrderRow,
} from "../_shared/smartcam-bot.ts";
import {
  decodeOrderToken,
  formatPrice,
  isShortOrderRef,
  parseCallbackData,
  verifyLinkPayload,
} from "../_shared/telegram.ts";
import {
  answerCallback,
  editMessageContent,
  getReceiptPhotoFileId,
  sendMessage,
  sendPhoto,
  type TelegramMessage,
} from "../_shared/bot-send.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type CallbackQuery = {
  id: string;
  data?: string;
  from?: { id?: number; first_name?: string };
  message?: TelegramMessage;
};

type Deps = {
  botToken: string;
  adminClient: ReturnType<typeof createClient>;
};

// ─── Admin error notifier ─────────────────────────────────────────────────────

async function notifyAdminError(deps: Deps, detail: string) {
  try {
    const chatIds = await resolveAdminChatIds(deps.adminClient);
    const text = `⚠️ BOT XATO:\n\`\`\`\n${detail.slice(0, 800)}\n\`\`\``;
    await Promise.all(
      Array.from(chatIds).map((chatId) =>
        sendMessage(deps.botToken, chatId, text).catch(() => {}),
      ),
    );
  } catch {
    // never throw from error reporter
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function fetchOrderById(deps: Deps, orderId: string): Promise<BotOrderRow | null> {
  const { data, error } = await deps.adminClient
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as BotOrderRow | null;
}

async function fetchOrderByRef(deps: Deps, ref: string): Promise<BotOrderRow | null> {
  const prefix = ref.replace(/_/g, "").toLowerCase().slice(0, 8);
  // UUID range query: prefix-0000... to prefix-ffff... avoids ILIKE on uuid column
  const low = `${prefix}-0000-0000-0000-000000000000`;
  const high = `${prefix}-ffff-ffff-ffff-ffffffffffff`;
  const { data, error } = await deps.adminClient
    .from("orders")
    .select(ORDER_SELECT)
    .gte("id", low)
    .lte("id", high)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as BotOrderRow | null;
}

async function resolveOrderByToken(deps: Deps, rawToken: string): Promise<BotOrderRow | null> {
  const fullId = decodeOrderToken(rawToken);
  if (fullId) return fetchOrderById(deps, fullId);
  if (isShortOrderRef(rawToken)) return fetchOrderByRef(deps, rawToken);
  return null;
}

async function resolveOrderIdFromToken(deps: Deps, rawToken: string): Promise<string | null> {
  const order = await resolveOrderByToken(deps, rawToken);
  return order?.id ?? null;
}

async function fetchLinkedUser(deps: Deps, telegramId: number) {
  const { data } = await deps.adminClient
    .from("users")
    .select("id,full_name,telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return data;
}

async function fetchCustomerTelegramId(deps: Deps, userId: string): Promise<number | null> {
  const { data } = await deps.adminClient
    .from("users")
    .select("telegram_id")
    .eq("id", userId)
    .maybeSingle();
  return typeof data?.telegram_id === "number" ? data.telegram_id : null;
}

async function getSession(deps: Deps, telegramId: number) {
  const { data } = await deps.adminClient
    .from("telegram_sessions")
    .select("state,temp_data")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return data;
}

// ─── Payment helpers ──────────────────────────────────────────────────────────

async function sendPaymentSetup(
  deps: Deps,
  chatId: number,
  telegramId: number,
  userId: string,
  order: BotOrderRow,
) {
  await prepareReceiptSession(deps.adminClient, telegramId, userId, order.id);
  await sendMessage(deps.botToken, chatId, renderPaymentInstructions(order), buildPaymentPromptKeyboard(order.id));
}

async function resolveReceiptOrder(
  deps: Deps,
  userId: string,
  preferredOrderId?: string | null,
): Promise<BotOrderRow | null> {
  if (preferredOrderId) {
    const order = await fetchOrderById(deps, preferredOrderId);
    if (order && order.user_id === userId && needsPayment(order)) return order;
  }

  const { data } = await deps.adminClient
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", userId)
    .neq("payment_status", "paid")
    .filter("status", "not.in", "(rad_etildi,mijoz_qabul_qildi)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as BotOrderRow | null) ?? null;
}

async function forwardReceiptToAdmins(deps: Deps, order: BotOrderRow, photoFileId: string) {
  const chatIds = await resolveAdminChatIds(deps.adminClient);
  const caption = renderReceiptAdminCaption(order);
  const keyboard = buildReceiptReviewKeyboard(order.id);

  await Promise.all(
    Array.from(chatIds).map((adminChatId) =>
      sendPhoto(deps.botToken, adminChatId, photoFileId, caption, keyboard).catch((err) => {
        console.error("[bot] forwardReceiptToAdmins failed", {
          adminChatId,
          orderId: order.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }),
    ),
  );
}

// ─── Notify unpaid orders after linking ───────────────────────────────────────

async function notifyUnpaidOrders(deps: Deps, chatId: number, userId: string) {
  const { orders } = await fetchOrdersPage(deps.adminClient, 1, { userId, unpaidOnly: true });
  const notice = renderUnpaidOrdersNotice(orders);
  if (!notice) return;
  await sendMessage(deps.botToken, chatId, notice);
  for (const order of orders) {
    await sendPaymentSetup(deps, chatId, chatId, userId, order);
  }
}

// ─── Admin stats ──────────────────────────────────────────────────────────────

async function buildAdminStats(deps: Deps) {
  const [users, products, orders, newOrders, pendingPayments, revenueResult] = await Promise.all([
    deps.adminClient.from("users").select("id", { count: "exact", head: true }),
    deps.adminClient.from("products").select("id", { count: "exact", head: true }),
    deps.adminClient.from("orders").select("id", { count: "exact", head: true }),
    deps.adminClient.from("orders").select("id", { count: "exact", head: true }).eq("status", "yangi"),
    deps.adminClient.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
    deps.adminClient.from("orders").select("total_amount").eq("payment_status", "paid"),
  ]);

  const revenue = (revenueResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.total_amount ?? 0),
    0,
  );

  const LINE = "─────────────────────";
  return [
    "📊 SmartCam Statistika",
    LINE,
    `👥 Foydalanuvchilar: ${users.count ?? 0}`,
    `📦 Mahsulotlar: ${products.count ?? 0}`,
    LINE,
    `📋 Jami buyurtmalar: ${orders.count ?? 0}`,
    `🆕 Yangi: ${newOrders.count ?? 0}`,
    `⏳ To'lov kutilmoqda: ${pendingPayments.count ?? 0}`,
    LINE,
    `💵 Umumiy tushum: ${formatPrice(revenue)}`,
  ].join("\n");
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleReceiptUpload(
  deps: Deps,
  chatId: number,
  telegramId: number,
  photoFileId: string,
) {
  const linkedUser = await fetchLinkedUser(deps, telegramId);
  if (!linkedUser) {
    await sendMessage(deps.botToken, chatId, "🔗 Chek yuborish uchun avval saytda Telegram hisobingizni ulang.");
    return;
  }

  const session = await getSession(deps, telegramId);
  const sessionOrderId =
    session?.state === "awaiting_receipt" &&
    session.temp_data &&
    typeof session.temp_data === "object"
      ? (session.temp_data as { order_id?: string }).order_id
      : null;

  const order = await resolveReceiptOrder(deps, linkedUser.id, sessionOrderId);
  if (!order) {
    await sendMessage(
      deps.botToken,
      chatId,
      "📦 To'lanmagan buyurtma topilmadi. /orders buyrug'ini yuboring.",
    );
    return;
  }

  if (!needsPayment(order)) {
    await sendMessage(deps.botToken, chatId, "✅ Bu buyurtma allaqachon to'langan.");
    return;
  }

  const { error: updateError } = await deps.adminClient
    .from("orders")
    .update({ payment_status: "pending" })
    .eq("id", order.id);

  if (updateError) {
    await sendMessage(deps.botToken, chatId, "❌ To'lov holati yangilanmadi. Qayta urinib ko'ring.");
    return;
  }

  await clearSession(deps.adminClient, telegramId, linkedUser.id, "idle");
  await forwardReceiptToAdmins(deps, order, photoFileId);

  await sendMessage(
    deps.botToken,
    chatId,
    `✅ Chek qabul qilindi!\n\nBuyurtma #${order.id.slice(0, 8).toUpperCase()} tekshirilmoqda.\nAdmin tasdiqlagach xabar olasiz.`,
    buildBackToOrdersKeyboard(),
  );
}

// ─── Callback handler ─────────────────────────────────────────────────────────

async function handleCallback(
  deps: Deps,
  callbackQuery: CallbackQuery,
) {
  const telegramId = Number(callbackQuery.from?.id ?? callbackQuery.message?.chat?.id);
  const chatId = Number(callbackQuery.message?.chat?.id);
  const message = callbackQuery.message!;
  const data = callbackQuery.data!;

  // Answer immediately to prevent Telegram timeout (must be < 10s)
  await answerCallback(deps.botToken, callbackQuery.id, "");

  const adminMode = await resolveAdminMode(deps.adminClient, telegramId);
  const { action, token: rawToken, extra } = parseCallbackData(data);

  // ── orders:PAGE ────────────────────────────────────────────────────────────
  if (action === "orders") {
    const page = Math.max(1, Number(extra ?? rawToken ?? "1") || 1);
    if (adminMode) {
      const { orders, hasMore } = await fetchOrdersPage(deps.adminClient, page);
      if (!orders.length) {
        await editMessageContent(deps.botToken, message, chatId, "📦 Buyurtma topilmadi.", undefined);
        return;
      }
      await editMessageContent(
        deps.botToken, message, chatId,
        renderAdminOrderListSummary(orders, page),
        buildOrdersListKeyboard(orders, page, hasMore),
      );
    } else {
      const linkedUser = await fetchLinkedUser(deps, telegramId);
      if (!linkedUser) {
        await editMessageContent(deps.botToken, message, chatId, "🔗 Avval Telegram hisobingizni ulang.", undefined);
        return;
      }
      const { orders, hasMore } = await fetchOrdersPage(deps.adminClient, page, { userId: linkedUser.id });
      if (!orders.length) {
        await editMessageContent(deps.botToken, message, chatId, "📦 Hozircha buyurtmalaringiz yo'q.", buildBackToOrdersKeyboard());
        return;
      }
      await editMessageContent(
        deps.botToken, message, chatId,
        renderOrderListSummary(orders, page, hasMore),
        buildOrdersListKeyboard(orders, page, hasMore),
      );
    }
    return;
  }

  // ── view:TOKEN ─────────────────────────────────────────────────────────────
  if (action === "view" && rawToken) {
    const order = await resolveOrderByToken(deps, rawToken);
    if (!order) {
      await editMessageContent(deps.botToken, message, chatId, "❌ Buyurtma topilmadi.", buildBackToOrdersKeyboard());
      return;
    }
    if (!adminMode) {
      const linkedUser = await fetchLinkedUser(deps, telegramId);
      if (!linkedUser || order.user_id !== linkedUser.id) {
        await editMessageContent(deps.botToken, message, chatId, "❌ Bu buyurtma sizga tegishli emas.", buildBackToOrdersKeyboard());
        return;
      }
    }
    await editMessageContent(
      deps.botToken, message, chatId,
      renderOrder(order, { admin: adminMode }),
      adminMode ? buildStatusKeyboard(order.id, order.status) : buildUserOrderKeyboard(order),
    );
    return;
  }

  // ── refresh:TOKEN ──────────────────────────────────────────────────────────
  if (action === "refresh" && rawToken) {
    const order = await resolveOrderByToken(deps, rawToken);
    if (!order) {
      await editMessageContent(deps.botToken, message, chatId, "❌ Buyurtma topilmadi.", buildBackToOrdersKeyboard());
      return;
    }
    if (!adminMode) {
      const linkedUser = await fetchLinkedUser(deps, telegramId);
      if (!linkedUser || order.user_id !== linkedUser.id) {
        await editMessageContent(deps.botToken, message, chatId, "❌ Bu buyurtma sizga tegishli emas.", buildBackToOrdersKeyboard());
        return;
      }
    }
    await editMessageContent(
      deps.botToken, message, chatId,
      renderOrder(order, { admin: adminMode }),
      adminMode ? buildStatusKeyboard(order.id, order.status) : buildUserOrderKeyboard(order),
    );
    return;
  }

  // ── tel:TOKEN (admin only) ─────────────────────────────────────────────────
  if (action === "tel" && rawToken) {
    if (!adminMode) {
      await answerCallback(deps.botToken, callbackQuery.id, "⛔ Faqat admin uchun.");
      return;
    }
    const order = await resolveOrderByToken(deps, rawToken);
    const phone = order?.customer_phone ?? "—";
    const name = order?.customer_name ?? "—";
    await sendMessage(
      deps.botToken, chatId,
      `📞 Mijoz telefoni:\n${name}: ${phone}`,
    );
    return;
  }

  // ── set:TOKEN:STATUS (admin status change) ────────────────────────────────
  if (action === "set" && rawToken && extra) {
    if (!adminMode) {
      await sendMessage(deps.botToken, chatId, "⛔ Faqat admin uchun.");
      return;
    }
    if (!isValidOrderStatus(extra)) {
      await sendMessage(deps.botToken, chatId, "❌ Noto'g'ri holat.");
      return;
    }

    const orderId = await resolveOrderIdFromToken(deps, rawToken);
    if (!orderId) {
      await sendMessage(deps.botToken, chatId, "❌ Buyurtma topilmadi.");
      return;
    }

    const currentOrder = await fetchOrderById(deps, orderId);
    if (!currentOrder) {
      await sendMessage(deps.botToken, chatId, "❌ Buyurtma topilmadi.");
      return;
    }

    const nextStatus = extra;
    const oldStatus = currentOrder.status;

    if (oldStatus === nextStatus) {
      await sendMessage(deps.botToken, chatId, `ℹ️ Holat allaqachon: ${statusMap[nextStatus] ?? nextStatus}`);
      return;
    }

    const { error: updateError } = await deps.adminClient
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("[bot] status update failed", { orderId, nextStatus, error: updateError.message });
      await sendMessage(deps.botToken, chatId, "❌ Holat yangilanmadi. Qayta urinib ko'ring.");
      return;
    }

    await dispatchOrderEvent({
      event_type: "order_status_changed",
      order_id: orderId,
      user_id: currentOrder.user_id ?? "",
      old_status: oldStatus,
      new_status: nextStatus,
    });

    const updatedOrder = (await fetchOrderById(deps, orderId)) ?? { ...currentOrder, status: nextStatus };

    await editMessageContent(
      deps.botToken, message, chatId,
      renderOrder(updatedOrder, { admin: true, previousStatus: oldStatus }),
      buildStatusKeyboard(orderId, nextStatus),
    );
    return;
  }

  // ── rcpt_ok:TOKEN (admin approve receipt) ─────────────────────────────────
  if (action === "rcpt_ok" && rawToken) {
    if (!adminMode) {
      await sendMessage(deps.botToken, chatId, "⛔ Faqat admin uchun.");
      return;
    }

    const orderId = await resolveOrderIdFromToken(deps, rawToken);
    if (!orderId) { await sendMessage(deps.botToken, chatId, "❌ Buyurtma topilmadi."); return; }

    const order = await fetchOrderById(deps, orderId);
    if (!order) { await sendMessage(deps.botToken, chatId, "❌ Buyurtma topilmadi."); return; }

    const nextStatus = order.status === "yangi" ? "qabul_qilindi" : order.status;
    const oldStatus = order.status;

    const { error: updateError } = await deps.adminClient
      .from("orders")
      .update({ payment_status: "paid", status: nextStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("[bot] receipt approval failed", { orderId, error: updateError.message });
      await sendMessage(deps.botToken, chatId, "❌ To'lov tasdiqlanmadi. Qayta urinib ko'ring.");
      return;
    }

    const updatedOrder = (await fetchOrderById(deps, orderId)) ?? {
      ...order,
      payment_status: "paid",
      status: nextStatus,
    };

    if (oldStatus !== nextStatus && order.user_id) {
      await dispatchOrderEvent({
        event_type: "order_status_changed",
        order_id: orderId,
        user_id: order.user_id,
        old_status: oldStatus,
        new_status: nextStatus,
      });
    }

    if (order.user_id) {
      const customerTgId = await fetchCustomerTelegramId(deps, order.user_id);
      if (customerTgId) {
        await sendMessage(
          deps.botToken,
          customerTgId,
          `✅ To'lov tasdiqlandi!\n\nBuyurtma #${order.id.slice(0, 8).toUpperCase()} uchun ${formatPrice(Number(order.total_amount ?? 0))} qabul qilindi.\n\n${renderOrder(updatedOrder)}`,
          buildUserOrderKeyboard(updatedOrder),
        );
      }
    }

    await editMessageContent(
      deps.botToken, message, chatId,
      renderReceiptApprovedCaption(updatedOrder, oldStatus),
      buildStatusKeyboard(orderId, nextStatus),
    );
    return;
  }

  // ── rcpt_no:TOKEN (admin reject receipt) ──────────────────────────────────
  if (action === "rcpt_no" && rawToken) {
    if (!adminMode) {
      await sendMessage(deps.botToken, chatId, "⛔ Faqat admin uchun.");
      return;
    }

    const orderId = await resolveOrderIdFromToken(deps, rawToken);
    if (!orderId) { await sendMessage(deps.botToken, chatId, "❌ Buyurtma topilmadi."); return; }

    const order = await fetchOrderById(deps, orderId);
    if (!order) { await sendMessage(deps.botToken, chatId, "❌ Buyurtma topilmadi."); return; }

    const { error: updateError } = await deps.adminClient
      .from("orders")
      .update({ payment_status: "rejected" })
      .eq("id", orderId);

    if (updateError) {
      console.error("[bot] receipt rejection failed", { orderId, error: updateError.message });
      await sendMessage(deps.botToken, chatId, "❌ Rad etilmadi. Qayta urinib ko'ring.");
      return;
    }

    const updatedOrder = (await fetchOrderById(deps, orderId)) ?? { ...order, payment_status: "rejected" };

    if (order.user_id) {
      const customerTgId = await fetchCustomerTelegramId(deps, order.user_id);
      if (customerTgId) {
        await sendMessage(
          deps.botToken,
          customerTgId,
          `❌ To'lov cheki rad etildi.\n\nBuyurtma #${order.id.slice(0, 8).toUpperCase()} uchun to'g'ri chek rasmini qayta yuboring.`,
          buildPaymentPromptKeyboard(orderId),
        );
      }
    }

    await editMessageContent(
      deps.botToken, message, chatId,
      renderReceiptRejectedCaption(updatedOrder),
      buildStatusKeyboard(orderId, updatedOrder.status),
    );
    return;
  }

  // ── pay:TOKEN / receipt:TOKEN (user payment flow) ─────────────────────────
  if ((action === "pay" || action === "receipt") && rawToken) {
    const linkedUser = await fetchLinkedUser(deps, telegramId);
    if (!linkedUser) {
      await sendMessage(deps.botToken, chatId, "🔗 Avval Telegram hisobingizni ulang.");
      return;
    }

    const order = await resolveOrderByToken(deps, rawToken);
    if (!order) {
      await sendMessage(deps.botToken, chatId, "❌ Buyurtma topilmadi.");
      return;
    }
    if (order.user_id !== linkedUser.id) {
      await sendMessage(deps.botToken, chatId, "❌ Bu buyurtma sizga tegishli emas.");
      return;
    }
    if (!needsPayment(order)) {
      await sendMessage(deps.botToken, chatId, "✅ Bu buyurtma allaqachon to'langan.");
      return;
    }

    if (action === "receipt") {
      await prepareReceiptSession(deps.adminClient, telegramId, linkedUser.id, order.id);
      await sendMessage(deps.botToken, chatId, renderReceiptUploadPrompt(order));
    } else {
      await sendPaymentSetup(deps, chatId, telegramId, linkedUser.id, order);
    }
    return;
  }

  // ── cancel_receipt:TOKEN ───────────────────────────────────────────────────
  if (action === "cancel_receipt") {
    const linkedUser = await fetchLinkedUser(deps, telegramId);
    await clearSession(deps.adminClient, telegramId, linkedUser?.id ?? null, "idle");
    await editMessageContent(
      deps.botToken, message, chatId,
      "🚫 To'lov jarayoni bekor qilindi.",
      buildBackToOrdersKeyboard(),
    );
    return;
  }

  // ── unknown ────────────────────────────────────────────────────────────────
  console.warn("[bot] unknown callback action", { action, rawToken, extra });
}

// ─── Message commands ─────────────────────────────────────────────────────────

async function handleMessage(
  deps: Deps,
  message: TelegramMessage,
) {
  const chatId = Number(message.chat!.id);
  const telegramId = Number(message.from?.id ?? chatId);
  const text = (message.text ?? "").trim();
  const adminMode = await resolveAdminMode(deps.adminClient, telegramId);
  const linkedUser = adminMode ? null : await fetchLinkedUser(deps, telegramId);

  const session = await getSession(deps, telegramId);
  const keepAwaitingReceipt =
    !adminMode &&
    session?.state === "awaiting_receipt" &&
    !text.startsWith("/");

  // Update session state
  await deps.adminClient.from("telegram_sessions").upsert(
    {
      telegram_id: telegramId,
      user_id: linkedUser?.id ?? null,
      state: keepAwaitingReceipt
        ? "awaiting_receipt"
        : adminMode
        ? "admin"
        : "idle",
      temp_data: keepAwaitingReceipt
        ? session?.temp_data ?? {}
        : { last_text: text },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  );

  // ── /start ────────────────────────────────────────────────────────────────
  if (text.startsWith("/start")) {
    const parts = text.trim().split(/\s+/);
    const startPayload = parts.length > 1 ? parts.slice(1).join("_") : "";

    // Link account
    if (startPayload.startsWith("link_")) {
      const rest = startPayload.slice(5); // strip "link_"
      const segments = rest.split("_");
      // Format: link_{compactUserId}_{timestamp}_{signature}
      // compactUserId = 32 hex chars (UUID without dashes)
      // timestamp = base36
      // signature = 16 hex chars
      const signature = segments[segments.length - 1];
      const timestamp = segments[segments.length - 2];
      const compactUserId = segments.slice(0, -2).join("_");

      if (!compactUserId || !timestamp || !signature) {
        await sendMessage(deps.botToken, chatId, "❌ Link noto'g'ri yoki eskirgan.");
        return;
      }

      const isValid = await verifyLinkPayload({ botToken: deps.botToken, compactUserId, timestamp, signature });
      if (!isValid) {
        await sendMessage(deps.botToken, chatId, "❌ Link eskirgan (30 daqiqa). Saytdan qayta ulang.");
        return;
      }

      const userId = [
        compactUserId.slice(0, 8),
        compactUserId.slice(8, 12),
        compactUserId.slice(12, 16),
        compactUserId.slice(16, 20),
        compactUserId.slice(20),
      ].join("-");

      const updateData: Record<string, unknown> = { telegram_id: telegramId };
      if (adminMode) updateData.role = "admin";

      const { data: linked, error: linkError } = await deps.adminClient
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select("full_name")
        .single();

      if (linkError || !linked) {
        console.error("[bot] link account failed", { userId, telegramId, error: linkError?.message });
        await sendMessage(deps.botToken, chatId, "❌ Hisobni ulashda xato yuz berdi. Saytdan qayta urinib ko'ring.");
        return;
      }

      await clearSession(deps.adminClient, telegramId, userId, adminMode ? "admin" : "idle");

      await sendMessage(
        deps.botToken,
        chatId,
        adminMode
          ? `✅ ${linked.full_name ?? "Hisob"} admin sifatida ulandi.\n\n${renderAdminPanel(message.from?.first_name)}`
          : `✅ ${linked.full_name ?? "Hisob"} Telegram bilan muvaffaqiyatli ulandi.\n\n${renderUserPanel(message.from?.first_name)}`,
      );

      if (!adminMode) {
        await notifyUnpaidOrders(deps, chatId, userId);
      }
      return;
    }

    // Open specific order
    if (startPayload.startsWith("order_")) {
      const tokenPart = startPayload.slice(6); // strip "order_"
      const order = await resolveOrderByToken(deps, tokenPart);

      if (!order) {
        await sendMessage(deps.botToken, chatId, "❌ Buyurtma topilmadi yoki havola noto'g'ri.");
        return;
      }

      if (adminMode) {
        await sendMessage(
          deps.botToken, chatId,
          renderOrder(order, { admin: true }),
          buildStatusKeyboard(order.id, order.status),
        );
        return;
      }

      const currentLinked = await fetchLinkedUser(deps, telegramId);
      if (!currentLinked) {
        await sendMessage(
          deps.botToken, chatId,
          "🔗 Avval saytdagi profilingiz orqali Telegram hisobingizni ulang.",
        );
        return;
      }
      if (order.user_id !== currentLinked.id) {
        await sendMessage(deps.botToken, chatId, "❌ Bu buyurtma sizga tegishli emas.");
        return;
      }

      await sendMessage(
        deps.botToken, chatId,
        renderOrder(order),
        buildUserOrderKeyboard(order),
      );

      if (needsPayment(order)) {
        await sendPaymentSetup(deps, chatId, telegramId, currentLinked.id, order);
      }
      return;
    }

    // Plain /start
    await sendMessage(
      deps.botToken,
      chatId,
      adminMode ? renderAdminPanel(message.from?.first_name) : renderUserPanel(message.from?.first_name),
    );
    return;
  }

  // ── /cancel ───────────────────────────────────────────────────────────────
  if (text === "/cancel") {
    await clearSession(deps.adminClient, telegramId, linkedUser?.id ?? null, adminMode ? "admin" : "idle");
    await sendMessage(
      deps.botToken, chatId,
      "🚫 Joriy jarayon bekor qilindi.",
      buildBackToOrdersKeyboard(),
    );
    return;
  }

  // ── /help ─────────────────────────────────────────────────────────────────
  if (text === "/help") {
    await sendMessage(deps.botToken, chatId, renderHelp(adminMode));
    return;
  }

  // ── /admin ────────────────────────────────────────────────────────────────
  if (text === "/admin") {
    if (!adminMode) {
      await sendMessage(deps.botToken, chatId, "⛔ Siz admin emassiz.");
      return;
    }
    await sendMessage(deps.botToken, chatId, renderAdminPanel(message.from?.first_name));
    return;
  }

  // ── /admin_stats ──────────────────────────────────────────────────────────
  if (text === "/admin_stats") {
    if (!adminMode) {
      await sendMessage(deps.botToken, chatId, "⛔ Siz admin emassiz.");
      return;
    }
    const stats = await buildAdminStats(deps);
    await sendMessage(deps.botToken, chatId, stats);
    return;
  }

  // ── /orders ───────────────────────────────────────────────────────────────
  if (text === "/orders" || text === "/admin_orders") {
    if (adminMode) {
      const { orders, hasMore } = await fetchOrdersPage(deps.adminClient, 1);
      if (!orders.length) {
        await sendMessage(deps.botToken, chatId, "📦 Hozircha buyurtmalar topilmadi.");
        return;
      }
      await sendMessage(
        deps.botToken, chatId,
        renderAdminOrderListSummary(orders, 1),
        buildOrdersListKeyboard(orders, 1, hasMore),
      );
      return;
    }

    if (!linkedUser) {
      await sendMessage(
        deps.botToken, chatId,
        "🔗 Buyurtmalarni ko'rish uchun avval saytda Telegram hisobingizni ulang.",
      );
      return;
    }

    const { orders, hasMore } = await fetchOrdersPage(deps.adminClient, 1, { userId: linkedUser.id });
    if (!orders.length) {
      await sendMessage(deps.botToken, chatId, "📦 Hozircha buyurtmalaringiz yo'q.");
      return;
    }
    await sendMessage(
      deps.botToken, chatId,
      renderOrderListSummary(orders, 1, hasMore),
      buildOrdersListKeyboard(orders, 1, hasMore),
    );
    return;
  }

  // ── /admin_pending ────────────────────────────────────────────────────────
  if (text === "/admin_pending") {
    if (!adminMode) {
      await sendMessage(deps.botToken, chatId, "⛔ Siz admin emassiz.");
      return;
    }
    const { orders, hasMore } = await fetchOrdersPage(deps.adminClient, 1, { unpaidOnly: true });
    if (!orders.length) {
      await sendMessage(deps.botToken, chatId, "✅ To'lovni kutayotgan buyurtmalar yo'q.");
      return;
    }
    await sendMessage(
      deps.botToken, chatId,
      `⏳ To'lovni kutayotgan buyurtmalar:\n\n${renderAdminOrderListSummary(orders, 1)}`,
      buildOrdersListKeyboard(orders, 1, hasMore),
    );
    return;
  }

  // ── Awaiting receipt state — plain text reminder ───────────────────────────
  if (keepAwaitingReceipt) {
    await sendMessage(
      deps.botToken, chatId,
      "📸 Chek rasmini yuboring (foto sifatida).\n\nBekor qilish uchun /cancel yozing.",
    );
    return;
  }

  // ── Unknown command ───────────────────────────────────────────────────────
  await sendMessage(
    deps.botToken,
    chatId,
    adminMode
      ? "ℹ️ /help — yordam olish uchun"
      : "ℹ️ /orders — buyurtmalar | /help — yordam",
  );
}

// ─── Server ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ok = new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      console.error("[bot] missing env vars");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deps: Deps = {
      botToken,
      adminClient: createClient(supabaseUrl, serviceRoleKey),
    };

    const payload = await req.json();
    const callbackQuery = payload.callback_query as CallbackQuery | undefined;
    const message = (payload.message ?? payload.edited_message) as TelegramMessage | undefined;

    // ── Callback query ────────────────────────────────────────────────────────
    if (callbackQuery?.id && callbackQuery.data && callbackQuery.message?.chat?.id) {
      try {
        await handleCallback(deps, callbackQuery);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errStack = err instanceof Error ? (err.stack ?? "") : "";
        console.error("[bot] callback handler threw", {
          data: callbackQuery.data,
          chatId: callbackQuery.message.chat.id,
          fromId: callbackQuery.from?.id,
          error: errMsg,
          stack: errStack,
        });
        await notifyAdminError(deps, `[callback] data=${callbackQuery.data}\n${errMsg}`);
        await sendMessage(
          deps.botToken,
          Number(callbackQuery.message.chat.id),
          "❌ Xatolik yuz berdi. Qayta urinib ko'ring.",
        ).catch(() => {});
      }
      return ok;
    }

    // ── Photo / document (receipt upload) ─────────────────────────────────────
    if (message?.chat?.id) {
      const photoFileId = getReceiptPhotoFileId(message);
      if (photoFileId) {
        const chatId = Number(message.chat.id);
        const telegramId = Number(message.from?.id ?? chatId);
        try {
          await handleReceiptUpload(deps, chatId, telegramId, photoFileId);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("[bot] receipt upload threw", {
            chatId,
            error: errMsg,
            stack: err instanceof Error ? err.stack : "",
          });
          await notifyAdminError(deps, `[receipt] chatId=${chatId}\n${errMsg}`);
          await sendMessage(deps.botToken, chatId, "❌ Chekni qabul qilishda xato. Qayta urinib ko'ring.").catch(() => {});
        }
        return ok;
      }
    }

    // ── Text messages ──────────────────────────────────────────────────────────
    if (message?.chat?.id && message.text) {
      try {
        await handleMessage(deps, message);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[bot] message handler threw", {
          text: message.text,
          chatId: message.chat.id,
          error: errMsg,
          stack: err instanceof Error ? err.stack : "",
        });
        await notifyAdminError(deps, `[message] text=${message.text}\n${errMsg}`);
        await sendMessage(
          deps.botToken,
          Number(message.chat.id),
          "❌ Xatolik yuz berdi. Qayta urinib ko'ring.",
        ).catch(() => {});
      }
      return ok;
    }

    return ok;
  } catch (err) {
    console.error("[bot] unexpected top-level error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
