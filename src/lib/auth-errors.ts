import { AuthApiError } from "@supabase/supabase-js";

const authErrorMap: Record<string, string> = {
  "Invalid login credentials": "Foydalanuvchi nomi yoki parol noto'g'ri.",
  "Email not confirmed": "Hisob hali tasdiqlanmagan.",
  "User already registered": "Bu foydalanuvchi nomi bilan hisob allaqachon mavjud.",
};

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof AuthApiError) {
    return authErrorMap[error.message] ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Autentifikatsiya jarayonida noma'lum xato yuz berdi.";
}
