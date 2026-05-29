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
          role: "user" | "admin";
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
          avatar_url?: string | null;
          role?: "user" | "admin";
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
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          items: Json;
          total_amount: number;
          status: "yangi" | "yetkazilmoqda" | "yopildi" | "rad_etildi";
          customer_name: string | null;
          customer_phone: string | null;
          customer_region: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          items?: Json;
          total_amount?: number;
          status?: "yangi" | "yetkazilmoqda" | "yopildi" | "rad_etildi";
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
