import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { pool } from './db.js';
import { authRouter } from './routes/auth.js';
import { courseRouter } from './routes/courses.js';
import { scheduleRouter } from './routes/schedules.js';

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

app.disable('x-powered-by');
if (config.isProduction) app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '500kb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút.' },
});

const schedulerLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Bạn đang tạo lịch quá nhanh. Vui lòng thử lại sau một phút.' },
});

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth', authRouter);
app.use('/api/courses', courseRouter);
app.use('/api/schedules/generate', schedulerLimiter);
app.use('/api/schedules', scheduleRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Không tìm thấy API.' });
});

if (config.isProduction) {
  const clientDist = path.resolve(currentDirectory, '../../client/dist');
  app.use(express.static(clientDist, { maxAge: '1d', etag: true }));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Mã môn hoặc mã lớp đã tồn tại trong học kỳ này.' });
  }
  if (['ECONNREFUSED', 'ER_BAD_DB_ERROR', 'ER_ACCESS_DENIED_ERROR'].includes(error.code)) {
    return res.status(503).json({ message: 'Chưa thể kết nối MySQL. Hãy kiểm tra cấu hình database.' });
  }
  console.error(error);
  const status = error.status || 500;
  const message = status >= 500 && config.isProduction
    ? 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'
    : error.message || 'Đã có lỗi xảy ra.';
  res.status(status).json({ message });
});

const server = app.listen(config.port, () => {
  console.log(`API đang chạy tại http://localhost:${config.port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
