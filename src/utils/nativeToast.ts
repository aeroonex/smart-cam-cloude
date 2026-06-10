import { toast } from "sonner";
import { haptic } from "@/utils/haptic";

/**
 * #15 — Native uslubdagi Toast bildirishnomalari.
 * Brauzer `alert()` o'rniga ekran pastidan silliq chiqadi va haptik beradi.
 */
export const nativeToast = {
  success(message: string, description?: string) {
    haptic.success();
    return toast.success(message, { description, position: "bottom-center", duration: 2200 });
  },
  error(message: string, description?: string) {
    haptic.error();
    return toast.error(message, { description, position: "bottom-center", duration: 3000 });
  },
  info(message: string, description?: string) {
    haptic.light();
    return toast(message, { description, position: "bottom-center", duration: 2200 });
  },
  cart(message = "Mahsulot savatga qo'shildi") {
    haptic.medium();
    return toast.success(message, { position: "bottom-center", duration: 1800 });
  },
};
