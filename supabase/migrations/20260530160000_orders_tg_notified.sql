-- Add idempotency column to prevent duplicate Telegram notifications
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tg_order_notified boolean NOT NULL DEFAULT false;
