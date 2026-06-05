/**
 * Referral tizimi yordamchi funksiyalar
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export async function generateReferralCode(db: ReturnType<typeof createClient>, userId: string): Promise<string> {
  // Mavjud kodni tekshirish
  const { data: user } = await db
    .from("users")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();

  if (user?.referral_code) return user.referral_code;

  // Yangi unique kod yaratish (6 belgi)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  // Bazaga saqlash
  await db.from("users").update({ referral_code: code }).eq("id", userId);
  return code;
}

export async function processReferral(
  db: ReturnType<typeof createClient>,
  referralCode: string,
  newUserId: string,
): Promise<{ success: boolean; referrerId?: string }> {
  // Referral kodni topish
  const { data: referrer } = await db
    .from("users")
    .select("id")
    .eq("referral_code", referralCode)
    .neq("id", newUserId) // o'ziga o'zi ref bo'la olmaydi
    .maybeSingle();

  if (!referrer) return { success: false };

  // Mavjud referral tekshirish
  const { data: existing } = await db
    .from("referrals")
    .select("id")
    .eq("referred_id", newUserId)
    .maybeSingle();

  if (existing) return { success: false };

  // Referral yaratish
  const { error } = await db.from("referrals").insert({
    referrer_id: referrer.id,
    referred_id: newUserId,
    referrer_bonus: 10000,
    referred_bonus: 5000,
    is_activated: false,
  });

  return { success: !error, referrerId: referrer.id };
}

export function buildReferralMessage(code: string, botUsername: string): string {
  const link = `https://t.me/${botUsername}?start=ref${code}`;
  return [
    `🎁 <b>Do'stingni taklif qil, ikkalangiz ham bonus oling!</b>`,
    ``,
    `Sizning referal havolangiz:`,
    `<code>${link}</code>`,
    ``,
    `💰 Siz: <b>10,000 so'm</b> bonus`,
    `💰 Do'stingiz: <b>5,000 so'm</b> bonus`,
    ``,
    `(Bonuslar do'stingiz birinchi xaridi muvaffaqiyatli bo'lganda beriladi)`,
  ].join("\n");
}
