export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      banners: {
        Row: {
          id: string;
          image_url: string;
          link_url: string | null;
          title: string | null;
          subtitle: string | null;
          badge: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          link_url?: string | null;
          title?: string | null;
          subtitle?: string | null;
          badge?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["banners"]["Insert"]>;
      };
      promo_sections: {
        Row: {
          id: string;
          title: string;
          bg_color: string;
          text_color: string;
          end_time: string | null;
          product_ids: string[];
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title?: string;
          bg_color?: string;
          text_color?: string;
          end_time?: string | null;
          product_ids?: string[];
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["promo_sections"]["Insert"]>;
      };
      promo_codes: {
        Row: {
          id: string;
          code: string;
          discount_type: "percent" | "fixed";
          discount_value: number;
          max_uses: number | null;
          uses_count: number;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type?: "percent" | "fixed";
          discount_value: number;
          max_uses?: number | null;
          uses_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["promo_codes"]["Insert"]>;
      };
      user_addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          region: string;
          district: string | null;
          address: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          region: string;
          district?: string | null;
          address?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_addresses"]["Insert"]>;
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          bonus_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          bonus_amount?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["referrals"]["Insert"]>;
      };
      recently_viewed: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          viewed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recently_viewed"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          google_id: string | null;
          telegram_id: number | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          region: string | null;
          avatar_url: string | null;
          age: number | null;
          role: "user" | "admin" | "seller" | "courier";
          login_code: string | null;
          is_active: boolean;
          created_by: string | null;
          seller_note: string | null;
          wallet_balance: number;
          cashback_balance: number;
          referral_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          google_id?: string | null;
          telegram_id?: number | null;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          region?: string | null;
          age?: number | null;
          avatar_url?: string | null;
          role?: "user" | "admin" | "seller" | "courier";
          login_code?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          seller_note?: string | null;
          wallet_balance?: number;
          cashback_balance?: number;
          referral_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          images: string[] | null;
          status: "active" | "inactive";
          category: string | null;
          sold_count: number;
          specifications: Json | null;
          videos: string[] | null;
          is_recommended: boolean;
          stock_count: number;
          sizes: string[] | null;
          colors: string[] | null;
          cashback_amount: number;
          delivery_fee: number;
          delivery_free: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price?: number;
          images?: string[] | null;
          status?: "active" | "inactive";
          category?: string | null;
          sold_count?: number;
          specifications?: Json | null;
          videos?: string[] | null;
          is_recommended?: boolean;
          stock_count?: number;
          sizes?: string[] | null;
          colors?: string[] | null;
          cashback_amount?: number;
          delivery_fee?: number;
          delivery_free?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      product_reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          status: "pending" | "approved" | "rejected";
          is_approved: boolean;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          status?: "pending" | "approved" | "rejected";
          is_approved?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["product_reviews"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          items: Json;
          total_amount: number;
          status:
            | "yangi"
            | "qabul_qilindi"
            | "tolov_jarayonida"
            | "qadoqlanmoqda"
            | "yetkazilmoqda"
            | "mijoz_qabul_qildi"
            | "rad_etildi";
          payment_status: "unpaid" | "pending" | "paid" | "rejected";
          payment_method: string | null;
          promo_code: string | null;
          discount_amount: number;
          order_delivery_fee: number;
          address_detail: string | null;
          receipt_file_id: string | null;
          receipt_submitted_at: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          customer_region: string | null;
          notes: string | null;
          delivered_by: string | null;
          delivered_at: string | null;
          handover_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          items?: Json;
          delivered_by?: string | null;
          delivered_at?: string | null;
          handover_code?: string | null;
          total_amount?: number;
          status?:
            | "yangi"
            | "qabul_qilindi"
            | "tolov_jarayonida"
            | "qadoqlanmoqda"
            | "yetkazilmoqda"
            | "mijoz_qabul_qildi"
            | "rad_etildi";
          payment_status?: "unpaid" | "pending" | "paid" | "rejected";
          payment_method?: string | null;
          promo_code?: string | null;
          discount_amount?: number;
          order_delivery_fee?: number;
          address_detail?: string | null;
          receipt_file_id?: string | null;
          receipt_submitted_at?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_region?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      telegram_sessions: {
        Row: {
          telegram_id: number;
          user_id: string | null;
          state: string | null;
          temp_data: Json | null;
          updated_at: string;
        };
        Insert: {
          telegram_id: number;
          user_id?: string | null;
          state?: string | null;
          temp_data?: Json | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["telegram_sessions"]["Insert"]>;
      };
    };
  };
}
