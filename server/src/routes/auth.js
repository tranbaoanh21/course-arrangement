import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { config } from '../config.js';
import { authenticate, setSessionCookie } from '../middleware/auth.js';
import { credentialsSchema, parseOrThrow, signupSchema } from '../validation.js';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const input = parseOrThrow(signupSchema, req.body);
  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [input.email]);
  if (existing.length) {
    return res.status(409).json({ message: 'Email này đã được sử dụng.' });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const [result] = await pool.execute(
    'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
    [input.fullName, input.email, passwordHash],
  );
  const user = { id: result.insertId, fullName: input.fullName, email: input.email };
  setSessionCookie(res, user);
  res.status(201).json({ user });
});

authRouter.post('/login', async (req, res) => {
  const input = parseOrThrow(credentialsSchema, req.body);
  const [rows] = await pool.execute(
    'SELECT id, full_name, email, password_hash FROM users WHERE email = ?',
    [input.email],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
  }

  const responseUser = { id: user.id, fullName: user.full_name, email: user.email };
  setSessionCookie(res, responseUser);
  res.json({ user: responseUser });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('session', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
  res.status(204).end();
});

authRouter.get('/me', authenticate, async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT id, full_name, email FROM users WHERE id = ?',
    [req.user.id],
  );
  if (!rows[0]) return res.status(401).json({ message: 'Không tìm thấy tài khoản.' });
  res.json({
    user: { id: rows[0].id, fullName: rows[0].full_name, email: rows[0].email },
  });
});
