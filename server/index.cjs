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

/* ── Uploads papkasi ─────────────────────────────── */
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/* ── Middleware ──────────────────────────────────── */
app.use(cors({ origin: '*' }));
app.use(express.json());

/* ── Statik: yuklangan media ─────────────────────── */
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '7d',
  etag: true,
}));

/* ── Production: build qilingan frontend ─────────── */
if (isProd) {
  const distDir = path.join(__dirname, '..', 'dist');
  app.use(express.static(distDir));
}

/* ── Multer konfiguratsiyasi ─────────────────────── */
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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter(req, file, cb) {
    const ok = /image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime|x-msvideo)/.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error(`Noto'g'ri fayl turi: ${file.mimetype}`));
  },
});

/* ── POST /api/upload ────────────────────────────── */
app.post('/api/upload', upload.array('files', 20), (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: 'Fayl yuklanmadi' });
  }
  const urls = req.files.map(f => `/uploads/products/${f.filename}`);
  res.json({ urls });
});

/* ── DELETE /api/upload ──────────────────────────── */
app.delete('/api/upload', (req, res) => {
  const { filePath } = req.body;
  if (!filePath || !filePath.startsWith('/uploads/')) {
    return res.status(400).json({ error: "Noto'g'ri yo'l" });
  }
  const abs = path.join(__dirname, '..', filePath);
  try {
    fs.unlinkSync(abs);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Fayl topilmadi' });
  }
});

/* ── GET /api/media-list ─────────────────────────── */
app.get('/api/media-list', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR).map(name => ({
      name,
      url: `/uploads/products/${name}`,
      size: fs.statSync(path.join(UPLOADS_DIR, name)).size,
    }));
    res.json(files);
  } catch {
    res.json([]);
  }
});

/* ── Production SPA fallback ─────────────────────── */
if (isProd) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

/* ── Multer error handler ────────────────────────── */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`\n🚀 HammaBop server: http://localhost:${PORT}`);
  console.log(`   Media uploads : http://localhost:${PORT}/uploads/`);
  if (isProd) console.log(`   Frontend      : http://localhost:${PORT}`);
});
