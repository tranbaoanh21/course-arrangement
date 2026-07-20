import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';
const renderOrigin = process.env.RENDER_EXTERNAL_HOSTNAME
  ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
  : '';

if (isProduction) {
  const requiredVariables = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
  const missingVariables = requiredVariables.filter((name) => !process.env[name]);
  if (!process.env.CLIENT_ORIGIN && !renderOrigin) missingVariables.push('CLIENT_ORIGIN');
  if (missingVariables.length) {
    throw new Error(`Thiếu biến môi trường production: ${missingVariables.join(', ')}`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET production phải có ít nhất 32 ký tự.');
  }
}

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || renderOrigin || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me',
  isProduction,
  localScheduleOverrideEmail: process.env.LOCAL_SCHEDULE_OVERRIDE_EMAIL || '',
  localRequiredSections: (process.env.LOCAL_REQUIRED_SECTIONS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'course_arrangement',
    ssl: process.env.DB_SSL === 'true',
    sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  },
};
