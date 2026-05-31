import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { regions } from "@/constants";
import type { CheckoutForm } from "@/hooks/useProfile";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CheckoutForm;
  onFormChange: (form: CheckoutForm) => void;
  saving: boolean;
  onSave: () => void;
};

export function ProfileDialog({ open, onOpenChange, form, onFormChange, saving, onSave }: Props) {
  const update = (field: keyof CheckoutForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => onFormChange({ ...form, [field]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[30px] border-[#dbe7d8] bg-[#fcfdfc] p-0">
        <DialogHeader className="border-b border-[#e7eee5] px-6 py-6 text-left">
          <DialogTitle className="font-syne text-2xl font-extrabold text-[#1A3828]">
            Profil ma'lumotlari
          </DialogTitle>
          <DialogDescription className="text-sm text-[#5C7260]">
            Buyurtmalarni tez rasmiylashtirish uchun asosiy ma'lumotlarni saqlang.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4A7A5A]">Ism-familiya</label>
            <Input
              value={form.full_name}
              onChange={update("full_name")}
              className="h-12 rounded-2xl border-[#dbe7d8] bg-white"
              placeholder="Ism va familiya"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4A7A5A]">Telefon</label>
            <Input
              value={form.phone}
              onChange={update("phone")}
              className="h-12 rounded-2xl border-[#dbe7d8] bg-white"
              placeholder="+998 90 123 45 67"
              type="tel"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4A7A5A]">Viloyat / shahar</label>
            <select
              value={form.region}
              onChange={update("region")}
              className="flex h-12 w-full rounded-2xl border border-[#dbe7d8] bg-white px-4 text-sm outline-none transition focus:border-[#EE7526]"
            >
              <option value="">Hududni tanlang</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <Button
            disabled={saving}
            className="h-12 w-full rounded-full bg-[#EE7526] text-white hover:bg-[#d8661c]"
            onClick={onSave}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Saqlash
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
