'use strict';

const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  return next();
}

const registerRules = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 254 }),
  body('password')
    .isString()
    .isLength({ min: 12, max: 128 })
    .withMessage('Password must be 12-128 characters')
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 128 })
];

const reviewRules = [
  body('reviewer')
    .isString()
    .trim()
    .isLength({ min: 1, max: 80 })
    .matches(/^[\w .,'-]+$/)
    .withMessage('Reviewer name contains invalid characters'),
  body('comment')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .escape()
];

const checkoutRules = [
  body('user_id').isInt({ min: 1, max: 2147483647 }).toInt(),
  body('product_id').isInt({ min: 1, max: 2147483647 }).toInt(),
  body('quantity').isInt({ min: 1, max: 100 }).toInt(),
  body('payment_token')
    .isString()
    .matches(/^tok_[A-Za-z0-9]+$/)
    .withMessage('Invalid payment token format')
    .isLength({ min: 1, max: 128 })
];

const orderListRules = [
  body('user_id').optional().isInt({ min: 1 }).toInt()
];

module.exports = {
  handleValidation,
  registerRules,
  loginRules,
  reviewRules,
  checkoutRules,
  orderListRules
};
