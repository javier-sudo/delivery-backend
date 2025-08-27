// server.js
require('dotenv').config(); // (1) cargar .env lo PRIMERO

const express = require('express');
const app = express();
const logger = require('morgan');
const cors = require('cors');
const passport = require('passport');
const multer = require('multer');

// (2) Multer en memoria para archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// (3) middlewares básicos
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.disable('x-powered-by');

// (4) passport (si lo usas)
app.use(passport.initialize());
require('./config/passport')(passport);

// (5) rutas
const usersRoutes = require('./routes/userRoutes');
usersRoutes(app, upload); // <- PASAMOS upload

// (6) endpoints simples
app.get('/', (_, res) => res.send('Ruta raiz del backend'));
app.get('/test', (_, res) => res.send('Este es la ruta TEST'));

// (7) endpoint de prueba de subida directa
const { uploadFile } = require('./utils/storage_supabase');
app.post('/api/_test/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, msg: 'Falta campo image' });
    const { publicUrl } = await uploadFile(req.file.buffer, req.file.originalname, 'tests');
    return res.json({ ok: true, url: publicUrl });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// (8) manejador de errores
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

// (9) levantar servidor (un solo listen)
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`API lista en http://${HOST}:${PORT}`));
