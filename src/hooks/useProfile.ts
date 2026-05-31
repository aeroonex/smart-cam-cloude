import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { defaultCheckoutForm } from "@/constants";
import type { Database } from "@/integrations/supabase/types";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

export type CheckoutForm = {
  full_name: string;
  phone: string;
  region: string;
  notes: string;
};

function getFallbackProfile(user: User): Database["public"]["Tables"]["users"]["Insert"] {
  return {
    id: user.id,
    google_id: user.id,
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Foydalanuvchi",
    email: user.email ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  };
}

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<CheckoutForm>(defaultCheckoutForm);
  const [saving, setSaving] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const promptedRef = useRef(false);

  const syncFormFromProfile = useCallback((p: UserProfile) => {
    setForm((prev) => ({
      ...prev,
      full_name: p.full_name ?? "",
      phone: p.phone ?? "",
      region: p.region ?? "",
    }));
  }, []);

  const ensureProfile = useCallback(
    async (currentUser: User) => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        toast.error("Profil ma'lumotlarini olishda xato yuz berdi.");
        return;
      }

      if (data) {
        setProfile(data);
        syncFormFromProfile(data);
        return;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("users")
        .insert(getFallbackProfile(currentUser))
        .select("*")
        .single();

      if (insertError) {
        toast.error("Profil yaratilmadi. Qayta urinib ko'ring.");
        return;
      }

      setProfile(inserted);
      syncFormFromProfile(inserted);
    },
    [syncFormFromProfile],
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setForm(defaultCheckoutForm);
      promptedRef.current = false;
      return;
    }
    void ensureProfile(user);
  }, [ensureProfile, user]);

  useEffect(() => {
    if (!profile || promptedRef.current) return;
    if (!profile.phone || !profile.region) {
      promptedRef.current = true;
      setProfileOpen(true);
    }
  }, [profile]);

  const save = useCallback(async () => {
    if (!user) return false;
    if (!form.full_name || !form.phone || !form.region) {
      toast.error("Profil uchun barcha asosiy maydonlarni to'ldiring.");
      return false;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("users")
      .update({ full_name: form.full_name, phone: form.phone, region: form.region })
      .eq("id", user.id)
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      toast.error("Profilni saqlab bo'lmadi.");
      return false;
    }

    setProfile(data);
    setProfileOpen(false);
    toast.success("Profil ma'lumotlari saqlandi.");
    return true;
  }, [user, form]);

  const upsertForOrder = useCallback(
    async (currentUser: User) => {
      const { data, error } = await supabase
        .from("users")
        .upsert({
          id: currentUser.id,
          google_id: profile?.google_id ?? currentUser.id,
          email: currentUser.email ?? null,
          avatar_url: profile?.avatar_url ?? currentUser.user_metadata?.avatar_url ?? null,
          full_name: form.full_name,
          phone: form.phone,
          region: form.region,
        })
        .select("*")
        .single();

      if (error) {
        toast.error("Profilni yangilashda xato yuz berdi.");
        return false;
      }
      setProfile(data);
      return true;
    },
    [profile, form],
  );

  return { profile, form, setForm, saving, profileOpen, setProfileOpen, save, upsertForOrder };
}
