/**
 * HammaBop media upload server
 *
 * Dev:  npm run dev:all   (Vite :8080 + bu server :3001)
 * Prod: npm run build && npm start  (hammasi :3001 dan)
 *
 * Fayllar: /uploads/products/<timestamp>_<random>.<ext>
 * Supabase faqat shu yo'lni saqlaydi, brauzer serverdan yuklaydi.
 */

const express  = require('express');
const multer   = require('multer');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

/* ── Ruxsat etilgan originlar ────────────────────── */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Dev rejimida localhost ruxsat, prod da env dan oladi
if (!isProd) {
  ALLOWED_ORIGINS.push('http://localhost:8080', 'http://localhost:3001');
}

/* ── Uploads papkasi ─────────────────────────────── */
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/* ── Middleware ──────────────────────────────────── */
app.use(cors({
  origin(origin, cb) {
    // Server-to-server (origin yo'q) yoki ruxsat etilgan
    if (!origin || ALLOWED_ORIGINS.includes(origin) || !isProd) {
      return cb(null, true);
    }
    cb(new Error(`CORS: ${origin} ruxsat etilmagan`));
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

/* ── Xavfsizlik headerlari ───────────────────────── */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

/* ── Oddiy rate limiting (IP bo'yicha) ──────────── */
const requestCounts = new Map();
const RATE_WINDOW = 60_000; // 1 daqiqa
const RATE_LIMIT   = 60;    // daqiqada max so'rovlar

app.use('/api/', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = requestCounts.get(ip) || { count: 0, start: now };

  if (now - entry.start > RATE_WINDOW) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count++;
  requestCounts.set(ip, entry);

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Juda ko\'p so\'rov. Keyinroq urinib ko\'ring.' });
  }
  next();
});

// Eski yozuvlarni tozalash (har 5 daqiqada)
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW;
  for (const [ip, entry] of requestCounts.entries()) {
    if (entry.start < cutoff) requestCounts.delete(ip);
  }
}, 5 * 60_000);

/* ── Statik: yuklangan media ─────────────────────── */
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads'), {
  maxAge: '7d',
  etag: true,
  immutable: false,
}));

/* ── Production: build qilingan frontend ─────────── */
if (isProd) {
  const distDir = path.resolve(__dirname, '..', 'dist');
  app.use(express.static(distDir, { maxAge: '1d' }));
}

/* ── Multer konfiguratsiyasi ─────────────────────── */
const ALLOWED_MIME = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime|x-msvideo))$/;

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename(req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 20 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.test(file.mimetype)) {
      return cb(new Error(`Noto'g'ri fayl turi: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

/* ── Fayl yo'lini xavfsiz tekshirish ────────────── */
function safeResolvePath(userPath) {
  // Faqat /uploads/products/ ostidagi fayllar
  if (!userPath || typeof userPath !== 'string') return null;
  const normalized = path.normalize(userPath).replace(/\\/g, '/');
  if (!normalized.startsWith('/uploads/products/')) return null;
  // Filename faqat safe belgilar
  const filename = path.basename(normalized);
  if (!/^[\w\-. ]+$/.test(filename)) return null;
  const abs = path.resolve(UPLOADS_DIR, filename);
  // Resolved yo'l UPLOADS_DIR ichida bo'lishi shart
  if (!abs.startsWith(UPLOADS_DIR + path.sep) && abs !== UPLOADS_DIR) return null;
  return abs;
}

/* ── Supabase client (server side) ──────────────── */
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl    = process.env.SUPABASE_URL || '';
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin  = supabaseUrl && supabaseSecret
  ? createClient(supabaseUrl, supabaseSecret)
  : null;

const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_IDS  = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number).filter(Boolean);
const APP_URL    = process.env.APP_URL || 'https://aigate.uz';
const SUPABASE_FN_URL = process.env.SUPABASE_URL
  ? process.env.SUPABASE_URL.replace('.supabase.co', '.supabase.co') + '/functions/v1'
  : '';

async function tgSend(chatId, text, keyboard) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: keyboard }),
  });
}

/* ── POST /api/nasiya-callback — Alif/Uzum webhook ── */
app.post('/api/nasiya-callback', async (req, res) => {
  try {
    const { order_id, status, provider, user_id } = req.body;
    if (!order_id || !status) return res.status(400).json({ error: 'order_id va status kerak' });

    if (status === 'rejected' && supabaseAdmin) {
      // Notifications funksiyasiga jo'natish
      if (SUPABASE_FN_URL) {
        await fetch(`${SUPABASE_FN_URL}/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseSecret}`,
          },
          body: JSON.stringify({
            type: 'nasiya_reject',
            payload: { order_id, user_id, provider: provider || 'alif' },
          }),
        });
      }
    } else if (status === 'approved' && supabaseAdmin) {
      await supabaseAdmin.from('orders').update({ nasiya_status: 'approved' }).eq('id', order_id);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[nasiya-callback]', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

/* ── POST /api/cart-snapshot — savatni saqlash (abandoned cart) ── */
app.post('/api/cart-snapshot', async (req, res) => {
  try {
    const { user_id, telegram_id, cart_data } = req.body;
    if (!user_id || !Array.isArray(cart_data)) return res.status(400).json({ error: 'Invalid data' });
    if (!supabaseAdmin) return res.json({ ok: false, reason: 'no_db' });

    const { error } = await supabaseAdmin.from('cart_snapshots').upsert({
      user_id,
      telegram_id: telegram_id || null,
      cart_data,
      item_count: cart_data.length,
      updated_at: new Date().toISOString(),
      alerted_at: null, // reset alert on cart update
    }, { onConflict: 'user_id' });

    if (error) console.error('[cart-snapshot]', error.message);
    res.json({ ok: !error });
  } catch (err) {
    console.error('[cart-snapshot]', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

/* ── POST /api/assign-courier — kuryerga buyurtma berish ── */
app.post('/api/assign-courier', async (req, res) => {
  try {
    const { order_id, courier_telegram_id, courier_name } = req.body;
    if (!order_id || !courier_telegram_id) return res.status(400).json({ error: 'Parametrlar to\'liq emas' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'DB ulanmagan' });

    if (SUPABASE_FN_URL) {
      const r = await fetch(`${SUPABASE_FN_URL}/courier-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseSecret}`,
        },
        body: JSON.stringify({
          action: 'assign',
          order_id,
          courier_telegram_id: Number(courier_telegram_id),
          courier_name: courier_name || 'Kuryer',
        }),
      });
      const data = await r.json();
      return res.json(data);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[assign-courier]', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

/* ── GET /api/tax-report?month=2026-06 — soliq hisoboti ── */
app.get('/api/tax-report', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'DB ulanmagan' });

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const from  = `${month}-01T00:00:00Z`;
    const to    = `${month}-31T23:59:59Z`;

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id,total_amount,payment_method,store_name,created_at,status')
      .gte('created_at', from)
      .lte('created_at', to)
      .eq('status', 'mijoz_qabul_qildi');

    if (error) return res.status(500).json({ error: error.message });

    // CSV generatsiya
    const rows = (orders || []);
    const total = rows.reduce((s, o) => s + (o.total_amount || 0), 0);

    // Do'konlar bo'yicha jami
    const storeMap = {};
    for (const o of rows) {
      const store = o.store_name || 'Nomalum';
      if (!storeMap[store]) storeMap[store] = { count: 0, total: 0 };
      storeMap[store].count++;
      storeMap[store].total += o.total_amount || 0;
    }

    const COMMISSION = 0.05; // 5% vositachilik
    const csvLines = [
      `"HammaBop Soliq Hisoboti — ${month}"`,
      ``,
      `"Buyurtma ID","Sana","Do'kon","To'lov","Summa","Holat"`,
      ...rows.map(o =>
        `"${o.id.slice(0,8).toUpperCase()}","${new Date(o.created_at).toLocaleDateString('ru-RU')}","${o.store_name||'—'}","${o.payment_method||'—'}","${o.total_amount}","${o.status}"`
      ),
      ``,
      `"Do'kon","Buyurtmalar","Jami aylanma","Sizning komissiya (${(COMMISSION*100).toFixed(0)}%)"`,
      ...Object.entries(storeMap).map(([store, d]) =>
        `"${store}","${d.count}","${d.total}","${Math.round(d.total * COMMISSION)}"`
      ),
      ``,
      `"JAMI AYLANMA","","${total}","${Math.round(total * COMMISSION)}"`,
    ];

    const csv = '﻿' + csvLines.join('\n'); // BOM for Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hammabop_tax_${month}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('[tax-report]', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

/* ── POST /api/upload ────────────────────────────── */
app.post('/api/upload', upload.array('files', 20), (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: 'Fayl yuklanmadi' });
  }
  const urls = req.files.map(f => `/uploads/products/${f.filename}`);
  console.log(`[upload] ${req.files.length} fayl yuklandi, IP: ${req.ip}`);
  res.json({ urls });
});

/* ── DELETE /api/upload ──────────────────────────── */
app.delete('/api/upload', (req, res) => {
  const { filePath } = req.body;
  const abs = safeResolvePath(filePath);

  if (!abs) {
    console.warn(`[delete] Noto'g'ri yo'l urinishi: ${filePath}, IP: ${req.ip}`);
    return res.status(400).json({ error: "Noto'g'ri yo'l" });
  }

  try {
    fs.unlinkSync(abs);
    console.log(`[delete] O'chirildi: ${path.basename(abs)}, IP: ${req.ip}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[delete] Xato: ${err.message}`);
    res.status(404).json({ error: 'Fayl topilmadi' });
  }
});

/* ── GET /api/media-list ─────────────────────────── */
app.get('/api/media-list', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(name => ALLOWED_MIME.test(
        name.endsWith('.mp4') ? 'video/mp4' :
        name.endsWith('.webm') ? 'video/webm' :
        name.endsWith('.webp') ? 'image/webp' :
        name.endsWith('.gif') ? 'image/gif' :
        name.endsWith('.png') ? 'image/png' : 'image/jpeg'
      ))
      .map(name => ({
        name,
        url: `/uploads/products/${name}`,
        size: fs.statSync(path.join(UPLOADS_DIR, name)).size,
      }))
      .sort((a, b) => b.size - a.size); // katta fayllar oldin
    res.json(files);
  } catch (err) {
    console.error(`[media-list] Xato: ${err.message}`);
    res.json([]);
  }
});

/* ── Production SPA fallback ─────────────────────── */
if (isProd) {
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
  });
}

/* ── Global error handler ────────────────────────── */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Yuklash xatosi: ${err.message}` });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  console.error('[server] Kutilmagan xato:', err);
  res.status(500).json({ error: 'Server xatosi' });
});

app.listen(PORT, () => {
  console.log(`\n HammaBop server: http://localhost:${PORT}`);
  console.log(`   Media uploads : http://localhost:${PORT}/uploads/`);
  if (isProd) console.log(`   Frontend      : http://localhost:${PORT}`);
  console.log(`   Rejim         : ${isProd ? 'PRODUCTION' : 'development'}\n`);
});
