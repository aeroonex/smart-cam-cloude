import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

type Props = {
  product: Product;
  onAddToCart: (p: Product) => void;
  size?: "sm" | "md";
};

export function AddToCartButton({ product, onAddToCart, size = "md" }: Props) {
  const { cart, updateQuantity } = useCart();
  const outOfStock = product.stock_count === 0;
  const qty = cart.find(i => i.id === product.id)?.qty ?? 0;

  const btnBase = size === "sm"
    ? "w-full rounded-lg py-1.5 text-[11px] font-bold transition active:scale-95"
    : "w-full rounded-xl py-2 text-[12px] font-bold transition active:scale-95";

  const controlBase = size === "sm"
    ? "flex items-center justify-between rounded-lg border border-[#1d4f8a] overflow-hidden mt-0"
    : "flex items-center justify-between rounded-xl border border-[#1d4f8a] overflow-hidden";

  const counterText = size === "sm" ? "text-[12px]" : "text-[13px]";
  const counterBtn = size === "sm" ? "text-[16px] py-1" : "text-[18px] py-1.5";

  if (outOfStock) {
    return (
      <button
        disabled
        className={`${btnBase} bg-neutral-100 text-neutral-400 cursor-not-allowed`}
      >
        Tugadi
      </button>
    );
  }

  if (qty === 0) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart(product);
          toast.success("Savatga qo'shildi");
        }}
        className={`${btnBase} bg-[#1d4f8a] text-white hover:bg-[#164078]`}
      >
        Savatga
      </button>
    );
  }

  return (
    <div
      onClick={e => e.stopPropagation()}
      className={controlBase}
    >
      <button
        onClick={() => {
          updateQuantity(product.id, -1);
          if (qty === 1) toast("Savatdan olib tashlandi");
        }}
        className={`flex-1 ${counterBtn} font-bold text-[#1d4f8a] hover:bg-blue-50 transition`}
      >
        −
      </button>
      <span className={`px-2 ${counterText} font-bold text-neutral-900 select-none`}>
        {qty}
      </span>
      <button
        onClick={() => {
          updateQuantity(product.id, 1);
        }}
        className={`flex-1 ${counterBtn} font-bold text-[#1d4f8a] hover:bg-blue-50 transition`}
      >
        +
      </button>
    </div>
  );
}
