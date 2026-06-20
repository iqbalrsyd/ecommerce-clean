'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { signToken } = require('../lib/auth');
const {
  registerRules,
  loginRules,
  handleValidation
} = require('../lib/validation');

const router = express.Router();
const BCRYPT_COST = 12;

router.post(
  '/register',
  registerRules,
  handleValidation,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
      const stmt = db.prepare(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)'
      );
      const result = stmt.run(email, passwordHash);
      return res.status(201).json({ id: result.lastInsertRowid, email });
    } catch (err) {
      if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

router.post(
  '/login',
  loginRules,
  handleValidation,
  async (req, res) => {
    const { email, password } = req.body;
    const user = db
      .prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?')
      .get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });

    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
      path: '/'
    });

    return res.json({ token });
  }
);

module.exports = router;
