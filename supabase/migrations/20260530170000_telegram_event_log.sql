-- Idempotency log for Telegram notifications to prevent duplicate sends.
CREATE TABLE IF NOT EXISTS public.telegram_event_log (
  event_key text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-clean entries older than 24 hours to keep the table small.
CREATE OR REPLACE FUNCTION public.clean_old_telegram_event_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.telegram_event_log WHERE created_at < now() - interval '24 hours';
$$;
