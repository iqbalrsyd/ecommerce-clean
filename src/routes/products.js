'use strict';

const express = require('express');
const db = require('../db');
const { reviewRules, handleValidation } = require('../lib/validation');

const router = express.Router();

router.get('/', (req, res) => {
  const products = db
    .prepare('SELECT id, name, price, description FROM products')
    .all();
  res.json(products);
});

router.get('/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid product id' });
  }
  const product = db
    .prepare('SELECT id, name, price, description FROM products WHERE id = ?')
    .get(id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  const reviews = db
    .prepare(
      'SELECT id, reviewer, comment, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 50'
    )
    .all(id);
  return res.json({ ...product, reviews });
});

router.post(
  '/:id/review',
  reviewRules,
  handleValidation,
  (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    const exists = db
      .prepare('SELECT 1 FROM products WHERE id = ?')
      .get(id);
    if (!exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const { reviewer, comment } = req.body;
    const result = db
      .prepare(
        'INSERT INTO reviews (product_id, reviewer, comment) VALUES (?, ?, ?)'
      )
      .run(id, reviewer, comment);
    return res.status(201).json({
      id: result.lastInsertRowid,
      reviewer,
      comment
    });
  }
);

module.exports = router;
