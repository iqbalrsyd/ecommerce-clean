'use strict';

const express = require('express');
const db = require('../db');
const { authenticate } = require('../lib/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  let userId = req.user.sub;
  if (req.user.role !== 'admin' && req.query.user_id) {
    const requested = Number.parseInt(req.query.user_id, 10);
    if (requested !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    userId = requested;
  } else if (req.user.role === 'admin' && req.query.user_id) {
    const requested = Number.parseInt(req.query.user_id, 10);
    if (Number.isInteger(requested) && requested > 0) userId = requested;
  }

  const orders = db
    .prepare(
      'SELECT id, user_id, total, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
    )
    .all(userId);
  return res.json(orders);
});

module.exports = router;
