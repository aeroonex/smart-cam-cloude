import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";
import { dispatchOrderEvent } from "../_shared/order-events.ts";
import {
  buildOrdersListKeyboard,
  buildPaymentPromptKeyboard,
  buildReceiptReviewKeyboard,
  buildStatusKeyboard,
  buildUserOrderKeyboard,
  isValidOrderStatus,
  needsPayment,
  renderAdminOrderListSummary,
  renderOrder,
  renderOrderListSummary,
  prepareReceiptSession,
  renderPaymentInstructions,
  renderReceiptAdminCaption,
  renderReceiptApprovedCaption,
  renderReceiptRejectedCaption,
  renderReceiptUploadPrompt,
  renderUnpaidOrdersNotice,
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
  telegramRequest,
  telegramRequestSafe,
  verifyLinkPayload,
} from "../_shared/telegram.ts";

type TelegramMessage = {
  message_id?: number;
  chat?: { id?: number };
  text?: string;
  photo?: Array<{ file_id: string }>;
  document?: { file_id: string; mime_type?: string };
  from?: { id?: number; first_name?: string };
};

type CallbackQuery = {
  id: string;
  data?: string;
  from?: { id?: number; first_name?: string };
  message?: TelegramMessage;
};

const ORDER_SELECT =
  "id,total_amount,status,payment_status,customer_name,customer_phone,customer_region,created_at,items,user_id,receipt_file_id";

function parseStartPayload(text: string) {
  const parts = text.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

function getReceiptPhotoFileId(message: TelegramMessage) {
  if (message.photo?.length) {
    return message.photo[message.photo.length - 1]?.file_id ?? null;
  }

  const document = message.document;
  if (document?.file_id && document.mime_type?.startsWith("image/")) {
    return document.file_id;
  }

  return null;
}

function renderUserPanel(firstName?: string) {
  return [
    `Salom${firstName ? `, ${firstName}` : ""}! 👋`,
    "",
    "Siz uchun foydalanuvchi paneli tayyor.",
    "",
    "Buyruqlar:",
    "• /orders — so'nggi buyurtmalaringiz",
    "• /start order_<id> — muayyan buyurtmani ko'rish",
    "",
    "Agar akkaunt hali ulanmagan bo'lsa, saytdagi 'Telegram ulash' tugmasini bosing.",
  ].join("\n");
}

function renderAdminPanel(firstName?: string) {
  return [
    `Salom${firstName ? `, ${firstName}` : ""}! 👋`,
    "",
    "Admin panel ochildi.",
    "",
    "Admin buyruqlar:",
    "• /admin_stats — umumiy statistika",
    "• /admin_orders — oxirgi buyurtmalar",
    "• /orders — oxirgi buyurtmalar ro'yxati",
    "• /start order_<id> — buyurtma kartasi va inline tugmalar",
  ].join("\n");
}

async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  try {
    return await telegramRequest(token, "sendMessage", {
      chat_id: chatId,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  } catch (error) {
    if (replyMarkup) {
      console.error("[telegram-bot] sendMessage with keyboard failed, retrying plain text", {
        error: error instanceof Error ? error.message : String(error),
      });
      return telegramRequest(token, "sendMessage", {
        chat_id: chatId,
        text: `${text}\n\n⚠️ Inline tugmalar vaqtincha yuklanmadi. /orders buyrug'ini qayta yuboring.`,
      });
    }
    throw error;
  }
}

async function sendTelegramPhoto(
  token: string,
  chatId: number,
  photoFileId: string,
  caption?: string,
  replyMarkup?: Record<string, unknown>,
) {
  return telegramRequest(token, "sendPhoto", {
    chat_id: chatId,
    photo: photoFileId,
    ...(caption ? { caption } : {}),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function editTelegramMessage(
  token: string,
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  return telegramRequestSafe(token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function editTelegramMessageContent(
  token: string,
  message: TelegramMessage,
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  if (!message.message_id) return;

  const messageId = Number(message.message_id);
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  };

  if (message.photo?.length) {
    const edited = await telegramRequestSafe(token, "editMessageCaption", {
      ...payload,
      caption: text,
    });

    if (edited === null && replyMarkup) {
      await telegramRequestSafe(token, "editMessageReplyMarkup", payload);
    }
    return;
  }

  await editTelegramMessage(token, chatId, messageId, text, replyMarkup);
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text: string) {
  try {
    await telegramRequest(token, "answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: text.length > 64,
    });
  } catch (error) {
    console.error("[telegram-bot] answerCallbackQuery failed", {
      callbackQueryId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function renderRecentOrders(
  adminClient: ReturnType<typeof createClient>,
  options?: { userId?: string; adminView?: boolean },
) {
  let query = adminClient
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(5);

  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BotOrderRow[];
}

async function fetchOrderById(adminClient: ReturnType<typeof createClient>, orderId: string) {
  const { data, error } = await adminClient.from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as BotOrderRow | null;
}

async function fetchOrderByRef(adminClient: ReturnType<typeof createClient>, ref: string) {
  const prefix = ref.replace(/_/g, "").toLowerCase().slice(0, 8);
  const { data, error } = await adminClient
    .from("orders")
    .select(ORDER_SELECT)
    .ilike("id", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as BotOrderRow | null;
}

async function resolveOrderFromToken(adminClient: ReturnType<typeof createClient>, rawToken: string) {
  const fullId = decodeOrderToken(rawToken);
  if (fullId) {
    return fetchOrderById(adminClient, fullId);
  }

  if (isShortOrderRef(rawToken)) {
    return fetchOrderByRef(adminClient, rawToken);
  }

  return null;
}

async function resolveOrderIdFromToken(adminClient: ReturnType<typeof createClient>, rawToken: string) {
  const order = await resolveOrderFromToken(adminClient, rawToken);
  return order?.id ?? null;
}

async function fetchLinkedUser(adminClient: ReturnType<typeof createClient>, telegramId: number) {
  const { data } = await adminClient.from("users").select("id,full_name").eq("telegram_id", telegramId).maybeSingle();
  return data;
}

async function notifyUnpaidOrders(
  botToken: string,
  chatId: number,
  adminClient: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data: unpaidOrders } = await adminClient
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", userId)
    .neq("payment_status", "paid")
    .filter("status", "not.in", "(rad_etildi,mijoz_qabul_qildi)")
    .order("created_at", { ascending: false })
    .limit(5);

  const orders = (unpaidOrders ?? []) as BotOrderRow[];
  const notice = renderUnpaidOrdersNotice(orders);

  if (!notice) return;

  await sendTelegramMessage(botToken, chatId, notice);

  for (const order of orders) {
    await sendPaymentSetup(botToken, chatId, adminClient, chatId, userId, order);
  }
}

async function sendPaymentSetup(
  botToken: string,
  chatId: number,
  adminClient: ReturnType<typeof createClient>,
  telegramId: number,
  userId: string,
  order: BotOrderRow,
) {
  await prepareReceiptSession(adminClient, telegramId, userId, order.id);
  await sendTelegramMessage(
    botToken,
    chatId,
    renderPaymentInstructions(order),
    buildPaymentPromptKeyboard(order.id),
  );
}

async function resolveReceiptOrder(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  preferredOrderId?: string | null,
) {
  if (preferredOrderId) {
    const order = await fetchOrderById(adminClient, preferredOrderId);
    if (order && order.user_id === userId && needsPayment(order)) {
      return order;
    }
  }

  const { data } = await adminClient
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

async function forwardReceiptToAdmins(
  botToken: string,
  adminClient: ReturnType<typeof createClient>,
  order: BotOrderRow,
  photoFileId: string,
) {
  const chatIds = await resolveAdminChatIds(adminClient);
  const caption = renderReceiptAdminCaption(order);
  const keyboard = buildReceiptReviewKeyboard(order.id);

  await Promise.all(
    Array.from(chatIds).map((adminChatId) =>
      sendTelegramPhoto(botToken, adminChatId, photoFileId, caption, keyboard).catch((error) => {
        console.error("[telegram-bot] forwardReceiptToAdmins failed", {
          adminChatId,
          orderId: order.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }),
    ),
  );
}

async function handleReceiptUpload(
  botToken: string,
  chatId: number,
  telegramId: number,
  photoFileId: string,
  adminClient: ReturnType<typeof createClient>,
) {
  const linkedUser = await fetchLinkedUser(adminClient, telegramId);
  if (!linkedUser) {
    await sendTelegramMessage(
      botToken,
      chatId,
      "🔗 Chek yuborish uchun avval saytdagi profilingiz orqali Telegram hisobingizni ulang.",
    );
    return;
  }

  const { data: session } = await adminClient
    .from("telegram_sessions")
    .select("state,temp_data")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  const sessionOrderId =
    session?.state === "awaiting_receipt" && session.temp_data && typeof session.temp_data === "object"
      ? (session.temp_data as { order_id?: string }).order_id
      : null;

  const order = await resolveReceiptOrder(adminClient, linkedUser.id, sessionOrderId);
  if (!order) {
    await sendTelegramMessage(
      botToken,
      chatId,
      "📸 To'lanmagan buyurtma topilmadi. /orders buyrug'ini yuboring yoki saytdan buyurtma havolasini oching.",
    );
    return;
  }

  if (!needsPayment(order)) {
    await sendTelegramMessage(botToken, chatId, "✅ Bu buyurtma allaqachon to'langan.");
    return;
  }

  const { error: updateError } = await adminClient
    .from("orders")
    .update({ payment_status: "pending" })
    .eq("id", order.id);

  if (updateError) {
    await sendTelegramMessage(botToken, chatId, "❌ To'lov holati yangilanmadi. Qayta urinib ko'ring.");
    return;
  }

  await adminClient.from("telegram_sessions").upsert(
    {
      telegram_id: telegramId,
      user_id: linkedUser.id,
      state: "idle",
      temp_data: {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  );

  await forwardReceiptToAdmins(botToken, adminClient, order, photoFileId);

  await sendTelegramMessage(
    botToken,
    chatId,
    `✅ Chek qabul qilindi!\n\nBuyurtma #${order.id.slice(0, 8).toUpperCase()} uchun to'lov tekshirilmoqda. Admin tasdiqlagach xabar olasiz.`,
  );
}

async function renderAdminStats(adminClient: ReturnType<typeof createClient>) {
  const [usersResult, productsResult, ordersResult, newOrdersResult] = await Promise.all([
    adminClient.from("users").select("id", { count: "exact", head: true }),
    adminClient.from("products").select("id", { count: "exact", head: true }),
    adminClient.from("orders").select("id", { count: "exact", head: true }),
    adminClient.from("orders").select("id", { count: "exact", head: true }).eq("status", "yangi"),
  ]);

  if (usersResult.error || productsResult.error || ordersResult.error || newOrdersResult.error) {
    throw new Error(
      usersResult.error?.message ||
        productsResult.error?.message ||
        ordersResult.error?.message ||
        newOrdersResult.error?.message ||
        "Statistika olinmadi",
    );
  }

  return [
    "SmartCam Admin Statistikasi",
    "",
    `• Foydalanuvchilar: ${usersResult.count ?? 0}`,
    `• Mahsulotlar: ${productsResult.count ?? 0}`,
    `• Jami buyurtmalar: ${ordersResult.count ?? 0}`,
    `• Yangi buyurtmalar: ${newOrdersResult.count ?? 0}`,
  ].join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("[telegram-bot] health check request");
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      console.error("[telegram-bot] missing required environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const payload = await req.json();
    const callbackQuery = payload.callback_query as CallbackQuery | undefined;
    const message = (payload.message ?? payload.edited_message) as TelegramMessage | undefined;

    if (callbackQuery?.id && callbackQuery.data && callbackQuery.message?.chat?.id) {
      const telegramId = Number(callbackQuery.from?.id ?? callbackQuery.message.chat.id);
      const chatId = Number(callbackQuery.message.chat.id);
      const adminMode = await resolveAdminMode(adminClient, telegramId);
      const { action, token: rawOrderToken, extra } = parseCallbackData(callbackQuery.data);
      const orderId = rawOrderToken ? await resolveOrderIdFromToken(adminClient, rawOrderToken) : null;
      let callbackAnswer = "Amal bajarildi.";
      let callbackAnswered = false;

      try {
        if (action === "set" && orderId && extra) {
          if (!adminMode) {
            callbackAnswer = "Siz admin emassiz.";
          } else if (!isValidOrderStatus(extra)) {
            callbackAnswer = "Noto'g'ri holat.";
          } else {
            const currentOrder = await fetchOrderById(adminClient, orderId);

            if (!currentOrder) {
              callbackAnswer = "Buyurtma topilmadi.";
            } else {
              const nextStatus = extra;
              const oldStatus = currentOrder.status;

              if (oldStatus !== nextStatus) {
                await answerCallbackQuery(botToken, callbackQuery.id, "Holat yangilanmoqda...");
                callbackAnswered = true;

                const { error: updateError } = await adminClient
                  .from("orders")
                  .update({ status: nextStatus })
                  .eq("id", orderId);

                if (updateError) {
                  console.error("[telegram-bot] status update failed", {
                    orderId,
                    nextStatus,
                    error: updateError.message,
                  });
                  callbackAnswer = "Status yangilanmadi.";
                } else {
                  await dispatchOrderEvent({
                    event_type: "order_status_changed",
                    order_id: orderId,
                    user_id: currentOrder.user_id ?? "",
                    old_status: oldStatus,
                    new_status: nextStatus,
                  });

                  const updatedOrder = (await fetchOrderById(adminClient, orderId)) ?? {
                    ...currentOrder,
                    status: nextStatus,
                  };

                  await editTelegramMessageContent(
                    botToken,
                    callbackQuery.message,
                    chatId,
                    renderOrder(updatedOrder, { admin: true, previousStatus: oldStatus }),
                    buildStatusKeyboard(orderId),
                  );

                  callbackAnswer = `Holat: ${statusMap[nextStatus] ?? nextStatus}`;
                }
              } else {
                callbackAnswer = `Holat allaqachon: ${statusMap[nextStatus] ?? nextStatus}`;
              }
            }
          }
        } else if (action === "rcpt_ok" && orderId) {
          if (!adminMode) {
            callbackAnswer = "Siz admin emassiz.";
          } else {
            const order = await fetchOrderById(adminClient, orderId);

            if (!order) {
              callbackAnswer = "Buyurtma topilmadi.";
            } else {
              await answerCallbackQuery(botToken, callbackQuery.id, "To'lov tasdiqlanmoqda...");
              callbackAnswered = true;

              const nextStatus = order.status === "yangi" ? "qabul_qilindi" : order.status;
              const oldStatus = order.status;

              const { error: updateError } = await adminClient
                .from("orders")
                .update({
                  payment_status: "paid",
                  status: nextStatus,
                })
                .eq("id", orderId);

              if (updateError) {
                console.error("[telegram-bot] receipt approval failed", {
                  orderId,
                  error: updateError.message,
                });
                callbackAnswer = "To'lov tasdiqlanmadi.";
              } else {
                const updatedOrder = (await fetchOrderById(adminClient, orderId)) ?? {
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
                  const { data: customer } = await adminClient
                    .from("users")
                    .select("telegram_id")
                    .eq("id", order.user_id)
                    .maybeSingle();

                  if (typeof customer?.telegram_id === "number") {
                    await sendTelegramMessage(
                      botToken,
                      customer.telegram_id,
                      `✅ To'lov tasdiqlandi!\n\nBuyurtma #${order.id.slice(0, 8).toUpperCase()} uchun ${formatPrice(Number(order.total_amount ?? 0))} qabul qilindi.\n\n${renderOrder(updatedOrder)}`,
                    );
                  }
                }

                await editTelegramMessageContent(
                  botToken,
                  callbackQuery.message,
                  chatId,
                  renderReceiptApprovedCaption(updatedOrder, oldStatus),
                  buildStatusKeyboard(orderId),
                );

                callbackAnswer = "To'lov tasdiqlandi.";
              }
            }
          }
        } else if (action === "rcpt_no" && orderId) {
          if (!adminMode) {
            callbackAnswer = "Siz admin emassiz.";
          } else {
            const order = await fetchOrderById(adminClient, orderId);

            if (!order) {
              callbackAnswer = "Buyurtma topilmadi.";
            } else {
              await answerCallbackQuery(botToken, callbackQuery.id, "To'lov rad etilmoqda...");
              callbackAnswered = true;

              const { error: updateError } = await adminClient
                .from("orders")
                .update({
                  payment_status: "rejected",
                })
                .eq("id", orderId);

              if (updateError) {
                console.error("[telegram-bot] receipt rejection failed", {
                  orderId,
                  error: updateError.message,
                });
                callbackAnswer = "To'lov rad etilmadi.";
              } else {
                const updatedOrder = (await fetchOrderById(adminClient, orderId)) ?? {
                  ...order,
                  payment_status: "rejected",
                };

                if (order.user_id) {
                  const { data: customer } = await adminClient
                    .from("users")
                    .select("telegram_id")
                    .eq("id", order.user_id)
                    .maybeSingle();

                  if (typeof customer?.telegram_id === "number") {
                    await sendTelegramMessage(
                      botToken,
                      customer.telegram_id,
                      `❌ To'lov cheki rad etildi.\n\nBuyurtma #${order.id.slice(0, 8).toUpperCase()} uchun to'g'ri chek rasmini qayta yuboring.`,
                      buildPaymentPromptKeyboard(orderId),
                    );
                  }
                }

                await editTelegramMessageContent(
                  botToken,
                  callbackQuery.message,
                  chatId,
                  renderReceiptRejectedCaption(updatedOrder),
                  buildStatusKeyboard(orderId),
                );

                callbackAnswer = "To'lov rad etildi.";
              }
            }
          }
        } else if ((action === "view" || action === "pay" || action === "receipt") && orderId) {
          const order = await fetchOrderById(adminClient, orderId);
          const linkedUser = adminMode ? null : await fetchLinkedUser(adminClient, telegramId);

          if (!order) {
            callbackAnswer = "Buyurtma topilmadi.";
          } else if (
            !adminMode &&
            (!linkedUser || order.user_id !== linkedUser.id)
          ) {
            callbackAnswer = linkedUser
              ? "Bu buyurtma sizga tegishli emas."
              : "Avval Telegram hisobingizni ulang.";
          } else if (action === "view") {
            await sendTelegramMessage(
              botToken,
              chatId,
              renderOrder(order, { admin: adminMode }),
              adminMode ? buildStatusKeyboard(orderId) : buildUserOrderKeyboard(order),
            );
            callbackAnswer = "Buyurtma ochildi.";
          } else if (needsPayment(order)) {
            if (!linkedUser) {
              callbackAnswer = "Avval Telegram hisobingizni ulang.";
            } else {
              callbackAnswer =
                action === "receipt" ? "Endi chek rasmini yuboring." : "To'lov ko'rsatmalari yuborildi.";
              await answerCallbackQuery(botToken, callbackQuery.id, callbackAnswer);
              callbackAnswered = true;

              if (action === "receipt") {
                await prepareReceiptSession(adminClient, telegramId, linkedUser.id, orderId);
                await sendTelegramMessage(botToken, chatId, renderReceiptUploadPrompt(order));
              } else {
                await sendPaymentSetup(botToken, chatId, adminClient, telegramId, linkedUser.id, order);
              }
            }
          } else {
            callbackAnswer = "Bu buyurtma allaqachon to'langan.";
          }
        } else {
          callbackAnswer = "Noto'g'ri buyruq.";
        }
      } catch (error) {
        console.error("[telegram-bot] callback handler failed", {
          action,
          orderId,
          error: error instanceof Error ? error.message : String(error),
        });
        callbackAnswer = "Xatolik yuz berdi. Qayta urinib ko'ring.";
      }

      if (!callbackAnswered) {
        await answerCallbackQuery(botToken, callbackQuery.id, callbackAnswer);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const photoFileId = message ? getReceiptPhotoFileId(message) : null;
    if (message?.chat?.id && photoFileId) {
      const chatId = Number(message.chat.id);
      const telegramId = Number(message.from?.id ?? chatId);
      await handleReceiptUpload(botToken, chatId, telegramId, photoFileId, adminClient);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message?.chat?.id || !message.text) {
      console.log("[telegram-bot] ignored unsupported update");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = Number(message.chat.id);
    const text = message.text.trim();
    const telegramId = Number(message.from?.id ?? chatId);
    const adminMode = await resolveAdminMode(adminClient, telegramId);
    const linkedUser = adminMode ? null : await fetchLinkedUser(adminClient, telegramId);

    const { data: existingSession } = await adminClient
      .from("telegram_sessions")
      .select("state,temp_data")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    const keepAwaitingReceipt =
      !adminMode &&
      existingSession?.state === "awaiting_receipt" &&
      !text.startsWith("/");

    await adminClient.from("telegram_sessions").upsert(
      {
        telegram_id: telegramId,
        user_id: linkedUser?.id ?? null,
        state: keepAwaitingReceipt ? "awaiting_receipt" : adminMode ? "admin" : "idle",
        temp_data: keepAwaitingReceipt ? existingSession?.temp_data ?? {} : { last_text: text },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "telegram_id" },
    );

    if (text.startsWith("/start")) {
      const startPayload = parseStartPayload(text);

      if (startPayload.startsWith("link_")) {
        const [, compactUserId, timestamp, signature] = startPayload.split("_");

        if (!compactUserId || !timestamp || !signature) {
          await sendTelegramMessage(botToken, chatId, "❌ Link noto'g'ri yoki eskirgan.");
        } else {
          const isValid = await verifyLinkPayload({
            botToken,
            compactUserId,
            timestamp,
            signature,
          });

          if (!isValid) {
            await sendTelegramMessage(botToken, chatId, "❌ Link eskirgan yoki noto'g'ri. Saytdan qayta ulab ko'ring.");
          } else {
            const userId = `${compactUserId.slice(0, 8)}-${compactUserId.slice(8, 12)}-${compactUserId.slice(12, 16)}-${compactUserId.slice(16, 20)}-${compactUserId.slice(20)}`;
            const updatePayload: Record<string, unknown> = { telegram_id: telegramId };

            if (adminMode) {
              updatePayload.role = "admin";
            }

            const { data: linkedAccount, error: userError } = await adminClient
              .from("users")
              .update(updatePayload)
              .eq("id", userId)
              .select("full_name")
              .single();

            if (userError || !linkedAccount) {
              console.error("[telegram-bot] failed to link telegram account", {
                userId,
                telegramId,
                userError: userError?.message,
              });
              await sendTelegramMessage(botToken, chatId, "❌ Hisobni ulashda xato yuz berdi.");
            } else {
              await adminClient.from("telegram_sessions").upsert({
                telegram_id: telegramId,
                user_id: userId,
                state: adminMode ? "admin" : "idle",
                temp_data: {},
              });

              await sendTelegramMessage(
                botToken,
                chatId,
                adminMode
                  ? `✅ ${linkedAccount.full_name || "Hisob"} admin sifatida ulandi.\n\n${renderAdminPanel(message.from?.first_name)}`
                  : `✅ ${linkedAccount.full_name || "Hisob"} Telegram bilan muvaffaqiyatli ulandi.\n\n${renderUserPanel(message.from?.first_name)}`,
              );

              if (!adminMode) {
                await notifyUnpaidOrders(botToken, chatId, adminClient, userId);
              }
            }
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (startPayload.startsWith("order_")) {
        const orderId = decodeOrderToken(startPayload.replace("order_", ""));

        if (!orderId) {
          await sendTelegramMessage(botToken, chatId, "❌ Buyurtma havolasi noto'g'ri.");
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (adminMode) {
          const order = await fetchOrderById(adminClient, orderId);

          if (!order) {
            await sendTelegramMessage(botToken, chatId, "❌ Buyurtma topilmadi.");
          } else {
            await sendTelegramMessage(
              botToken,
              chatId,
              renderOrder(order, { admin: true }),
              buildStatusKeyboard(order.id),
            );
          }

          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!linkedUser) {
          await sendTelegramMessage(
            botToken,
            chatId,
            "🔗 Avval saytdagi profilingiz orqali Telegram hisobingizni ulang, keyin order tracking ishlaydi.",
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: order, error: orderError } = await adminClient
          .from("orders")
          .select(ORDER_SELECT)
          .eq("id", orderId)
          .eq("user_id", linkedUser.id)
          .maybeSingle();

        if (orderError || !order) {
          await sendTelegramMessage(botToken, chatId, "❌ Bu buyurtma topilmadi yoki sizga tegishli emas.");
        } else {
          const typedOrder = order as BotOrderRow;
          await sendTelegramMessage(
            botToken,
            chatId,
            renderOrder(typedOrder),
            buildUserOrderKeyboard(typedOrder),
          );

          if (needsPayment(typedOrder)) {
            await sendPaymentSetup(botToken, chatId, adminClient, telegramId, linkedUser.id, typedOrder);
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await sendTelegramMessage(
        botToken,
        chatId,
        adminMode ? renderAdminPanel(message.from?.first_name) : renderUserPanel(message.from?.first_name),
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text === "/admin" || text === "/admin_stats") {
      if (!adminMode) {
        await sendTelegramMessage(botToken, chatId, "⛔ Siz admin emassiz.");
      } else if (text === "/admin") {
        await sendTelegramMessage(botToken, chatId, renderAdminPanel(message.from?.first_name));
      } else {
        const statsText = await renderAdminStats(adminClient);
        await sendTelegramMessage(botToken, chatId, statsText);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text === "/admin_orders" || text === "/orders") {
      if (adminMode) {
        const orders = await renderRecentOrders(adminClient, { adminView: true });

        if (!orders.length) {
          await sendTelegramMessage(botToken, chatId, "📦 Hozircha buyurtmalar topilmadi.");
        } else {
          await sendTelegramMessage(botToken, chatId, renderAdminOrderListSummary(orders));

          for (const order of orders) {
            await sendTelegramMessage(
              botToken,
              chatId,
              renderOrder(order, { admin: true }),
              buildStatusKeyboard(order.id),
            );
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!linkedUser) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "🔗 Buyurtmalarni ko'rish uchun avval saytdagi profilingiz orqali Telegram hisobingizni ulang.",
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orders = await renderRecentOrders(adminClient, { userId: linkedUser.id });
      if (!orders.length) {
        await sendTelegramMessage(botToken, chatId, "📦 Hozircha buyurtmalaringiz topilmadi.");
      } else {
        await sendTelegramMessage(
          botToken,
          chatId,
          renderOrderListSummary(orders),
          buildOrdersListKeyboard(orders),
        );
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sendTelegramMessage(
      botToken,
      chatId,
      adminMode
        ? "ℹ️ Admin buyruqlar: /admin, /admin_stats, /admin_orders, /orders"
        : "ℹ️ Buyruqlar: /orders yoki saytdan buyurtma tracking havolasini oching.",
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[telegram-bot] unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
