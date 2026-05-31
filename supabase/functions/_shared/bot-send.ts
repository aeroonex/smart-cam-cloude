import { telegramRequest, telegramRequestSafe } from "./telegram.ts";

export type TelegramMessage = {
  message_id?: number;
  chat?: { id?: number };
  text?: string;
  photo?: Array<{ file_id: string }>;
  document?: { file_id: string; mime_type?: string };
  from?: { id?: number; first_name?: string };
};

export async function sendMessage(
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
      console.error("[bot-send] sendMessage with keyboard failed, retrying plain text", {
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

export async function sendPhoto(
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

export async function answerCallback(token: string, callbackQueryId: string, text: string) {
  try {
    await telegramRequest(token, "answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: text.length > 64,
    });
  } catch (error) {
    console.error("[bot-send] answerCallbackQuery failed", {
      callbackQueryId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function editMessageContent(
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
    const edited = await telegramRequestSafe(token, "editMessageCaption", { ...payload, caption: text });
    if (edited === null && replyMarkup) {
      await telegramRequestSafe(token, "editMessageReplyMarkup", payload);
    }
    return;
  }

  await telegramRequestSafe(token, "editMessageText", { ...payload, text });
}

export function getReceiptPhotoFileId(message: TelegramMessage) {
  if (message.photo?.length) {
    return message.photo[message.photo.length - 1]?.file_id ?? null;
  }
  const doc = message.document;
  if (doc?.file_id && doc.mime_type?.startsWith("image/")) {
    return doc.file_id;
  }
  return null;
}
