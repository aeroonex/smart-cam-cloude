-- Notify Telegram when a new order is inserted (works even if frontend invoke fails).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_order_created_telegram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://vhbrbptcnkzkfdbxehgt.supabase.co/functions/v1/telegram-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-smartcam-hook-secret', 'smartcam-order-hook-v1-5064451675'
    ),
    body := jsonb_build_object(
      'event_type', 'order_created',
      'order_id', NEW.id,
      'user_id', NEW.user_id,
      'hook_secret', 'smartcam-order-hook-v1-5064451675'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_telegram_notify_insert ON public.orders;
CREATE TRIGGER trg_orders_telegram_notify_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_created_telegram();
