-- Telegram bot foydalanuvchi holati (chek yuborish va boshqalar uchun).

CREATE TABLE IF NOT EXISTS public.telegram_sessions (
  telegram_id bigint PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'idle',
  temp_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telegram_sessions_user_id_idx ON public.telegram_sessions(user_id);

ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;
