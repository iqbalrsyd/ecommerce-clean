'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authenticate, generateCsrfToken, safeEqual } = require('../lib/auth');
const { checkoutRules, handleValidation } = require('../lib/validation');

const router = express.Router();

function getStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('replace-')) {
    throw new Error('STRIPE_SECRET_KEY must be provided by the secret manager');
  }
  return key;
}

router.get('/csrf-token', authenticate, (req, res) => {
  const token = generateCsrfToken();
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000
  });
  res.json({ csrfToken: token });
});

router.post(
  '/',
  authenticate,
  checkoutRules,
  handleValidation,
  (req, res) => {
    const csrfHeader = req.headers['x-csrf-token'];
    const csrfCookie = req.cookies['XSRF-TOKEN'];
    if (!csrfHeader || !csrfCookie || !safeEqual(csrfHeader, csrfCookie)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    if (req.user.sub !== req.body.user_id) {
      return res.status(403).json({ error: 'User mismatch' });
    }

    const { user_id, product_id, quantity, payment_token } = req.body;

    const product = db
      .prepare('SELECT id, price FROM products WHERE id = ?')
      .get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const total = Math.round(product.price * quantity * 100) / 100;

    const txn = db.transaction(() => {
      const result = db
        .prepare(
          'INSERT INTO orders (user_id, total, status, payment_token) VALUES (?, ?, ?, ?)'
        )
        .run(user_id, total, 'pending', payment_token);
      return result.lastInsertRowid;
    });
    const orderId = txn();

    try {
      const stripeKey = getStripeKey();
      const paymentIntent = crypto
        .createHmac('sha256', stripeKey)
        .update(`${orderId}:${payment_token}`)
        .digest('hex');
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(
        'processing',
        orderId
      );
      return res.json({ order_id: orderId, total, payment_intent: paymentIntent });
    } catch (err) {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(
        'failed',
        orderId
      );
      return res.status(502).json({ error: 'Payment provider error' });
    }
  }
);

module.exports = router;
