-- Extend order lifecycle statuses and add payment tracking.

UPDATE public.orders SET status = 'mijoz_qabul_qildi' WHERE status = 'yopildi';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'yangi',
      'qabul_qilindi',
      'tolov_jarayonida',
      'qadoqlanmoqda',
      'yetkazilmoqda',
      'mijoz_qabul_qildi',
      'rad_etildi'
    )
  );

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check CHECK (
    payment_status IN ('unpaid', 'pending', 'paid', 'rejected')
  );

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS receipt_file_id text,
  ADD COLUMN IF NOT EXISTS receipt_submitted_at timestamptz;
